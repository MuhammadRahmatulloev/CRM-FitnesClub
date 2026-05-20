from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings


class UserManager(BaseUserManager):
    def create_user(self, phone_number, email, first_name, last_name, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('Phone number is required')
        email = self.normalize_email(email)
        user = self.model(phone_number=phone_number, email=email, first_name=first_name, last_name=last_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, email, first_name, last_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(phone_number, email, first_name, last_name, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('trainer', 'Trainer'),
        ('client', 'Client'),
    ]
    username = None
    objects = UserManager() 
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, unique=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='client')
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class ClientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    nickname = models.CharField(max_length=100, null=True, blank=True)
    photo = models.ImageField(upload_to='clients/', null=True, blank=True)

    def __str__(self):
        return f"{self.user}"


class TrainerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trainer_profile')
    bio = models.TextField(null=True, blank=True)
    specialization = models.CharField(max_length=255, null=True, blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    photo = models.ImageField(upload_to='trainers/', null=True, blank=True)

    def __str__(self):
        return f"{self.user}"


class MembershipPlan(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    price_per_month = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ClientMembership(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('frozen', 'Frozen'),
        ('expired', 'Expired'),
    ]
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    plan = models.ForeignKey(MembershipPlan, on_delete=models.CASCADE)
    start_date = models.DateField()
    months_count = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client} - {self.plan}"


class Payment(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
    ]
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    membership = models.ForeignKey(ClientMembership, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='unpaid')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client} - {self.amount}"


class TrainingPlan(models.Model):
    TYPE_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_plans')
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    plan_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class TrainingWeek(models.Model):
    plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE, related_name='weeks')
    week_number = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.plan} - Week {self.week_number}"


class TrainingDay(models.Model):
    plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE, related_name='days', null=True, blank=True)
    week = models.ForeignKey(TrainingWeek, on_delete=models.CASCADE, related_name='days', null=True, blank=True)
    day_number = models.PositiveIntegerField()
    day_name = models.CharField(max_length=20)
    is_rest = models.BooleanField(default=False)

    def __str__(self):
        return f"Day {self.day_number} - {self.day_name}"


class Exercise(models.Model):
    day = models.ForeignKey(TrainingDay, on_delete=models.CASCADE, related_name='exercises')
    name = models.CharField(max_length=200)
    sets = models.PositiveIntegerField(null=True, blank=True)
    reps = models.PositiveIntegerField(null=True, blank=True)
    duration = models.CharField(max_length=50, null=True, blank=True)
    rest_time = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name


class ClientTrainingPlan(models.Model):
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_plans')
    plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE)
    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_by')
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.client} - {self.plan}"


class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Cart(models.Model):
    client = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart - {self.client}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.product} x{self.quantity}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('ready', 'Ready'),
        ('picked_up', 'Picked Up'),
        ('cancelled', 'Cancelled'),
    ]
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=50, unique=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    qr_code = models.ImageField(upload_to='qrcodes/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product} x{self.quantity}"


class Receipt(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='receipt')
    issued_at = models.DateTimeField(auto_now_add=True)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Receipt - {self.order}"
    

class Message(models.Model):
    FILE_TYPE_CHOICES = [
        ('text',  'Text'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('file',  'File'),
    ]

    sender     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content    = models.TextField(null=True, blank=True)
    file       = models.FileField(upload_to='chat_files/', null=True, blank=True)
    file_type  = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, default='text')
    file_name  = models.CharField(max_length=255, null=True, blank=True)  
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender} → {self.receiver}: {self.file_type}"

    @staticmethod
    def build_room_name(user_id_1, user_id_2):
        ids = sorted([int(user_id_1), int(user_id_2)])
        return f"chat_{ids[0]}_{ids[1]}"