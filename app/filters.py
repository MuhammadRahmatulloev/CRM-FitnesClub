from django_filters import rest_framework as filters
from .models import User, ClientMembership, Payment, TrainingPlan, Product, Order


class UserFilter(filters.FilterSet):
    role = filters.CharFilter(field_name='role', lookup_expr='exact')
    first_name = filters.CharFilter(field_name='first_name', lookup_expr='icontains')
    last_name = filters.CharFilter(field_name='last_name', lookup_expr='icontains')

    class Meta:
        model = User
        fields = ['role', 'first_name', 'last_name']


class ClientMembershipFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status', lookup_expr='exact')
    client = filters.NumberFilter(field_name='client__id')
    plan = filters.NumberFilter(field_name='plan__id')

    class Meta:
        model = ClientMembership
        fields = ['status', 'client', 'plan']


class PaymentFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status', lookup_expr='exact')
    client = filters.NumberFilter(field_name='client__id')
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Payment
        fields = ['status', 'client', 'date_from', 'date_to']


class TrainingPlanFilter(filters.FilterSet):
    plan_type = filters.CharFilter(field_name='plan_type', lookup_expr='exact')
    trainer = filters.NumberFilter(field_name='trainer__id')

    class Meta:
        model = TrainingPlan
        fields = ['plan_type', 'trainer']


class ProductFilter(filters.FilterSet):
    category = filters.NumberFilter(field_name='category__id')
    is_available = filters.BooleanFilter(field_name='is_available')
    min_price = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='price', lookup_expr='lte')

    class Meta:
        model = Product
        fields = ['category', 'is_available', 'min_price', 'max_price']


class OrderFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status', lookup_expr='exact')
    client = filters.NumberFilter(field_name='client__id')
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Order
        fields = ['status', 'client', 'date_from', 'date_to']