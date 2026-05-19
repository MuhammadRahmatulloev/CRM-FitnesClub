from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, ClientProfile, TrainerProfile,
    MembershipPlan, ClientMembership, Payment,
    TrainingPlan, TrainingWeek, TrainingDay, Exercise, ClientTrainingPlan,
    Category, Product, Cart, CartItem, Order, OrderItem, Receipt
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'first_name', 'last_name', 'phone_number', 'email', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['first_name', 'last_name', 'phone_number', 'email']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'age', 'address')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {'fields': ('phone_number', 'email', 'first_name', 'last_name', 'password1', 'password2', 'role')}),
    )


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'nickname']
    search_fields = ['user__first_name', 'user__last_name']


@admin.register(TrainerProfile)
class TrainerProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'specialization', 'experience_years']
    search_fields = ['user__first_name', 'user__last_name']


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'price_per_month', 'is_active']
    list_filter = ['is_active']


@admin.register(ClientMembership)
class ClientMembershipAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'plan', 'start_date', 'months_count', 'status']
    list_filter = ['status']
    search_fields = ['client__first_name', 'client__last_name']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'amount', 'status', 'paid_at', 'created_at']
    list_filter = ['status']
    search_fields = ['client__first_name', 'client__last_name']


@admin.register(TrainingPlan)
class TrainingPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'trainer', 'plan_type', 'created_at']
    list_filter = ['plan_type']
    search_fields = ['title', 'trainer__first_name']


@admin.register(TrainingWeek)
class TrainingWeekAdmin(admin.ModelAdmin):
    list_display = ['id', 'plan', 'week_number']


@admin.register(TrainingDay)
class TrainingDayAdmin(admin.ModelAdmin):
    list_display = ['id', 'day_number', 'day_name', 'is_rest']
    list_filter = ['is_rest']


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'sets', 'reps', 'duration']
    search_fields = ['name']


@admin.register(ClientTrainingPlan)
class ClientTrainingPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'plan', 'trainer', 'start_date', 'is_active']
    list_filter = ['is_active']
    search_fields = ['client__first_name', 'plan__title']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'price', 'stock', 'category', 'is_available']
    list_filter = ['is_available', 'category']
    search_fields = ['name']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'created_at']


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'cart', 'product', 'quantity']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'order_number', 'client', 'total_price', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['order_number', 'client__first_name']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'product', 'quantity', 'price']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'issued_by', 'issued_at']