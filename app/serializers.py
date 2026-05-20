from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from .models import (
    User, ClientProfile, TrainerProfile,
    MembershipPlan, ClientMembership, Payment,
    TrainingPlan, TrainingWeek, TrainingDay, Exercise, ClientTrainingPlan,
    Category, Product, Cart, CartItem, Order, OrderItem, Receipt, Message
)
from .tasks import send_password_email
import random
import string


class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'phone_number'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = f"{user.first_name} {user.last_name}"
        return token


class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ['id', 'nickname', 'photo']


class TrainerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerProfile
        fields = ['id', 'bio', 'specialization', 'experience_years', 'photo']


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'age', 'address', 'role']

    def create(self, validated_data):
        password = ''.join(random.choices(string.digits, k=6))
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == 'client':
            ClientProfile.objects.create(user=user)
        elif user.role == 'trainer':
            TrainerProfile.objects.create(user=user)
        send_password_email(user.email, user.first_name, user.phone_number, password)
        return user


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone_number', 'email', 'role', 'created_at']


class UserDetailSerializer(serializers.ModelSerializer):
    client_profile = ClientProfileSerializer(read_only=True)
    trainer_profile = TrainerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'age', 'address', 'role', 'created_at', 'client_profile', 'trainer_profile']


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'age', 'address']


class ClientProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ['nickname', 'photo']


class TrainerPublicSerializer(serializers.ModelSerializer):
    trainer_profile = TrainerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'trainer_profile']


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = ['id', 'name', 'description', 'price_per_month', 'is_active']


class ClientMembershipSerializer(serializers.ModelSerializer):
    plan_detail = MembershipPlanSerializer(source='plan', read_only=True)
    client_name = serializers.CharField(source='client', read_only=True)

    class Meta:
        model = ClientMembership
        fields = ['id', 'client', 'client_name', 'plan', 'plan_detail', 'start_date', 'months_count', 'status', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'client', 'client_name', 'membership', 'amount', 'status', 'paid_at', 'created_at']

    def update(self, instance, validated_data):
        if validated_data.get('status') == 'paid' and instance.status != 'paid':
            validated_data['paid_at'] = timezone.now()
        return super().update(instance, validated_data)


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'sets', 'reps', 'duration', 'rest_time', 'description']


class TrainingDaySerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = TrainingDay
        fields = ['id', 'day_number', 'day_name', 'is_rest', 'exercises']


class TrainingWeekSerializer(serializers.ModelSerializer):
    days = TrainingDaySerializer(many=True, read_only=True)

    class Meta:
        model = TrainingWeek
        fields = ['id', 'week_number', 'days']


class TrainingPlanSerializer(serializers.ModelSerializer):
    days = TrainingDaySerializer(many=True, read_only=True)
    weeks = TrainingWeekSerializer(many=True, read_only=True)
    trainer_name = serializers.CharField(source='trainer', read_only=True)

    class Meta:
        model = TrainingPlan
        fields = ['id', 'title', 'description', 'plan_type', 'trainer', 'trainer_name', 'days', 'weeks', 'created_at']


class TrainingPlanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingPlan
        fields = ['id', 'title', 'description', 'plan_type']

    def create(self, validated_data):
        validated_data['trainer'] = self.context['request'].user
        return super().create(validated_data)


class ClientTrainingPlanSerializer(serializers.ModelSerializer):
    plan_detail = TrainingPlanSerializer(source='plan', read_only=True)
    client_name = serializers.CharField(source='client', read_only=True)
    trainer_name = serializers.CharField(source='trainer', read_only=True)

    class Meta:
        model = ClientTrainingPlan
        fields = ['id', 'client', 'client_name', 'plan', 'plan_detail', 'trainer', 'trainer_name', 'start_date', 'is_active']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock', 'category', 'category_name', 'image', 'is_available']


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_detail', 'quantity']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'created_at']

    def get_total(self, obj):
        return sum(item.product.price * item.quantity for item in obj.items.all())


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'client', 'client_name', 'items', 'total_price', 'status', 'qr_code', 'created_at']


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']


class ReceiptSerializer(serializers.ModelSerializer):
    order_detail = OrderSerializer(source='order', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by', read_only=True)

    class Meta:
        model = Receipt
        fields = ['id', 'order', 'order_detail', 'issued_by', 'issued_by_name', 'issued_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.__str__', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'receiver', 'content', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'receiver',
            'content', 'file', 'file_type', 'file_name',
            'created_at',
        ]