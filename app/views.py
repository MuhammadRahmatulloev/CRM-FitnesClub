from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.files.base import ContentFile
from drf_spectacular.utils import extend_schema, extend_schema_view
import qrcode
import io
import uuid

from .models import (
    User, ClientProfile, TrainerProfile,
    MembershipPlan, ClientMembership, Payment,
    TrainingPlan, TrainingWeek, TrainingDay, Exercise, ClientTrainingPlan,
    Category, Product, Cart, CartItem, Order, OrderItem, Receipt
)
from .serializers import (
    PhoneTokenObtainPairSerializer,
    UserCreateSerializer, UserListSerializer, UserDetailSerializer, UserUpdateSerializer,
    ClientProfileSerializer, ClientProfileUpdateSerializer,
    TrainerProfileSerializer, TrainerPublicSerializer,
    MembershipPlanSerializer, ClientMembershipSerializer,
    PaymentSerializer,
    TrainingPlanSerializer, TrainingPlanCreateSerializer,
    TrainingWeekSerializer, TrainingDaySerializer, ExerciseSerializer,
    ClientTrainingPlanSerializer,
    CategorySerializer, ProductSerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer, OrderStatusUpdateSerializer, ReceiptSerializer
)
from .permissions import IsAdmin, IsTrainer, IsClient, IsAdminOrTrainer, IsOwnerOrAdmin
from .filters import UserFilter, ClientMembershipFilter, PaymentFilter, TrainingPlanFilter, ProductFilter, OrderFilter


@extend_schema(tags=['Auth'])
class LoginView(TokenObtainPairView):
    serializer_class = PhoneTokenObtainPairSerializer
    permission_classes = [AllowAny]


@extend_schema(tags=['Auth'])
class LogoutView(views.APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(tags=['Users']),
    post=extend_schema(tags=['Users'])
)
class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    filterset_class = UserFilter
    search_fields = ['first_name', 'last_name', 'phone_number', 'email']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer


@extend_schema_view(
    get=extend_schema(tags=['Users']),
    put=extend_schema(tags=['Users']),
    patch=extend_schema(tags=['Users']),
    delete=extend_schema(tags=['Users'])
)
class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserDetailSerializer


@extend_schema_view(
    get=extend_schema(tags=['Profile']),
    put=extend_schema(tags=['Profile']),
    patch=extend_schema(tags=['Profile'])
)
class MyProfileView(generics.RetrieveUpdateAPIView):
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_object(self):
        return self.request.user


@extend_schema_view(
    put=extend_schema(tags=['Profile']),
    patch=extend_schema(tags=['Profile'])
)
class ClientProfileUpdateView(generics.UpdateAPIView):
    serializer_class = ClientProfileUpdateSerializer
    permission_classes = [IsClient]

    def get_object(self):
        return get_object_or_404(ClientProfile, user=self.request.user)


@extend_schema_view(
    get=extend_schema(tags=['Trainers'])
)
class TrainerListView(generics.ListAPIView):
    queryset = User.objects.filter(role='trainer')
    serializer_class = TrainerPublicSerializer
    search_fields = ['first_name', 'last_name', 'trainer_profile__specialization']


@extend_schema_view(
    get=extend_schema(tags=['Trainers'])
)
class TrainerDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(role='trainer')
    serializer_class = TrainerPublicSerializer


@extend_schema_view(
    get=extend_schema(tags=['Trainers'])
)
class TrainerPlansView(generics.ListAPIView):
    serializer_class = TrainingPlanSerializer

    def get_queryset(self):
        return TrainingPlan.objects.filter(trainer_id=self.kwargs['pk'])


@extend_schema_view(
    get=extend_schema(tags=['Memberships']),
    post=extend_schema(tags=['Memberships'])
)
class MembershipPlanListCreateView(generics.ListCreateAPIView):
    queryset = MembershipPlan.objects.all()
    serializer_class = MembershipPlanSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()


@extend_schema_view(
    get=extend_schema(tags=['Memberships']),
    put=extend_schema(tags=['Memberships']),
    patch=extend_schema(tags=['Memberships']),
    delete=extend_schema(tags=['Memberships'])
)
class MembershipPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MembershipPlan.objects.all()
    serializer_class = MembershipPlanSerializer
    permission_classes = [IsAdmin]


@extend_schema_view(
    get=extend_schema(tags=['Memberships']),
    post=extend_schema(tags=['Memberships'])
)
class ClientMembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientMembershipSerializer
    filterset_class = ClientMembershipFilter

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ClientMembership.objects.all()
        return ClientMembership.objects.filter(client=user)


@extend_schema_view(
    get=extend_schema(tags=['Memberships']),
    put=extend_schema(tags=['Memberships']),
    patch=extend_schema(tags=['Memberships'])
)
class ClientMembershipDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ClientMembershipSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ClientMembership.objects.all()
        return ClientMembership.objects.filter(client=user)


@extend_schema_view(
    get=extend_schema(tags=['Payments']),
    post=extend_schema(tags=['Payments'])
)
class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all()
        return Payment.objects.filter(client=user)


@extend_schema_view(
    get=extend_schema(tags=['Payments']),
    put=extend_schema(tags=['Payments']),
    patch=extend_schema(tags=['Payments'])
)
class PaymentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all()
        return Payment.objects.filter(client=user)


@extend_schema_view(
    get=extend_schema(tags=['Training']),
    post=extend_schema(tags=['Training'])
)
class TrainingPlanListCreateView(generics.ListCreateAPIView):
    filterset_class = TrainingPlanFilter
    search_fields = ['title']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TrainingPlanCreateSerializer
        return TrainingPlanSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrTrainer()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return TrainingPlan.objects.all()
        if user.role == 'trainer':
            return TrainingPlan.objects.filter(trainer=user)
        assigned = ClientTrainingPlan.objects.filter(client=user, is_active=True).values_list('plan_id', flat=True)
        return TrainingPlan.objects.filter(id__in=assigned)


@extend_schema_view(
    get=extend_schema(tags=['Training']),
    put=extend_schema(tags=['Training']),
    patch=extend_schema(tags=['Training']),
    delete=extend_schema(tags=['Training'])
)
class TrainingPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TrainingPlanCreateSerializer
        return TrainingPlanSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminOrTrainer()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return TrainingPlan.objects.all()
        if user.role == 'trainer':
            return TrainingPlan.objects.filter(trainer=user)
        assigned = ClientTrainingPlan.objects.filter(client=user, is_active=True).values_list('plan_id', flat=True)
        return TrainingPlan.objects.filter(id__in=assigned)


@extend_schema_view(
    post=extend_schema(tags=['Training'])
)
class TrainingWeekCreateView(generics.CreateAPIView):
    serializer_class = TrainingWeekSerializer
    permission_classes = [IsAdminOrTrainer]

    def perform_create(self, serializer):
        plan = get_object_or_404(TrainingPlan, pk=self.kwargs['plan_id'])
        serializer.save(plan=plan)


@extend_schema_view(
    get=extend_schema(tags=['Training']),
    post=extend_schema(tags=['Training'])
)
class TrainingDayListCreateView(generics.ListCreateAPIView):
    serializer_class = TrainingDaySerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        return TrainingDay.objects.filter(plan_id=self.kwargs['plan_id'])

    def perform_create(self, serializer):
        plan = get_object_or_404(TrainingPlan, pk=self.kwargs['plan_id'])
        serializer.save(plan=plan)


@extend_schema_view(
    get=extend_schema(tags=['Training']),
    put=extend_schema(tags=['Training']),
    patch=extend_schema(tags=['Training']),
    delete=extend_schema(tags=['Training'])
)
class TrainingDayDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TrainingDaySerializer
    permission_classes = [IsAdminOrTrainer]
    queryset = TrainingDay.objects.all()


@extend_schema_view(
    post=extend_schema(tags=['Training'])
)
class ExerciseCreateView(generics.CreateAPIView):
    serializer_class = ExerciseSerializer
    permission_classes = [IsAdminOrTrainer]

    def perform_create(self, serializer):
        day = get_object_or_404(TrainingDay, pk=self.kwargs['day_id'])
        serializer.save(day=day)


@extend_schema_view(
    get=extend_schema(tags=['Training']),
    put=extend_schema(tags=['Training']),
    patch=extend_schema(tags=['Training']),
    delete=extend_schema(tags=['Training'])
)
class ExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExerciseSerializer
    permission_classes = [IsAdminOrTrainer]
    queryset = Exercise.objects.all()


@extend_schema_view(
    get=extend_schema(tags=['Training']),
    post=extend_schema(tags=['Training'])
)
class ClientTrainingPlanListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientTrainingPlanSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrTrainer()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ClientTrainingPlan.objects.all()
        if user.role == 'trainer':
            return ClientTrainingPlan.objects.filter(trainer=user)
        return ClientTrainingPlan.objects.filter(client=user)

    def perform_create(self, serializer):
        serializer.save(trainer=self.request.user)


@extend_schema_view(
    get=extend_schema(tags=['Training'])
)
class MyTrainingPlanView(generics.ListAPIView):
    serializer_class = TrainingPlanSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        assigned = ClientTrainingPlan.objects.filter(client=self.request.user, is_active=True).values_list('plan_id', flat=True)
        return TrainingPlan.objects.filter(id__in=assigned)


@extend_schema(tags=['Training'])
class TodayTrainingView(views.APIView):
    permission_classes = [IsClient]

    def get(self, request):
        day_number = timezone.now().isoweekday()
        assigned = ClientTrainingPlan.objects.filter(client=request.user, is_active=True).values_list('plan_id', flat=True)
        day = TrainingDay.objects.filter(plan_id__in=assigned, day_number=day_number).first()
        if not day:
            return Response({'detail': 'No training today.'})
        return Response(TrainingDaySerializer(day).data)


@extend_schema_view(
    get=extend_schema(tags=['Shop']),
    post=extend_schema(tags=['Shop'])
)
class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()


@extend_schema_view(
    get=extend_schema(tags=['Shop']),
    post=extend_schema(tags=['Shop'])
)
class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.filter(is_available=True)
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()


@extend_schema_view(
    get=extend_schema(tags=['Shop']),
    put=extend_schema(tags=['Shop']),
    patch=extend_schema(tags=['Shop']),
    delete=extend_schema(tags=['Shop'])
)
class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return super().get_permissions()


@extend_schema_view(
    get=extend_schema(tags=['Shop'])
)
class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsClient]

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(client=self.request.user)
        return cart


@extend_schema(tags=['Shop'])
class CartItemAddView(views.APIView):
    permission_classes = [IsClient]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(client=request.user)
        product = get_object_or_404(Product, pk=request.data.get('product'))
        quantity = int(request.data.get('quantity', 1))
        item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            item.quantity += quantity
        else:
            item.quantity = quantity
        item.save()
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    put=extend_schema(tags=['Shop']),
    patch=extend_schema(tags=['Shop'])
)
class CartItemUpdateView(generics.UpdateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        cart, _ = Cart.objects.get_or_create(client=self.request.user)
        return CartItem.objects.filter(cart=cart)


@extend_schema_view(
    delete=extend_schema(tags=['Shop'])
)
class CartItemDeleteView(generics.DestroyAPIView):
    permission_classes = [IsClient]

    def get_queryset(self):
        cart, _ = Cart.objects.get_or_create(client=self.request.user)
        return CartItem.objects.filter(cart=cart)


@extend_schema(tags=['Shop'])
class CartClearView(views.APIView):
    permission_classes = [IsClient]

    def delete(self, request):
        cart, _ = Cart.objects.get_or_create(client=request.user)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Shop'])
class CheckoutView(views.APIView):
    permission_classes = [IsClient]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(client=request.user)
        items = cart.items.all()
        if not items.exists():
            return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        total = sum(item.product.price * item.quantity for item in items)
        order_number = f"FIT-{timezone.now().year}-{str(uuid.uuid4())[:8].upper()}"
        order = Order.objects.create(client=request.user, order_number=order_number, total_price=total)
        for item in items:
            OrderItem.objects.create(order=order, product=item.product, quantity=item.quantity, price=item.product.price)
            item.product.stock -= item.quantity
            item.product.save()
        qr = qrcode.make(order_number)
        buffer = io.BytesIO()
        qr.save(buffer, format='PNG')
        order.qr_code.save(f"{order_number}.png", ContentFile(buffer.getvalue()), save=True)
        cart.items.all().delete()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(tags=['Shop'])
)
class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    filterset_class = OrderFilter

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Order.objects.all()
        return Order.objects.filter(client=user)


@extend_schema_view(
    get=extend_schema(tags=['Shop'])
)
class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Order.objects.all()
        return Order.objects.filter(client=user)


@extend_schema_view(
    put=extend_schema(tags=['Shop']),
    patch=extend_schema(tags=['Shop'])
)
class OrderStatusUpdateView(generics.UpdateAPIView):
    serializer_class = OrderStatusUpdateSerializer
    permission_classes = [IsAdmin]
    queryset = Order.objects.all()

    def perform_update(self, serializer):
        order = serializer.save()
        if order.status == 'picked_up':
            Receipt.objects.get_or_create(order=order, defaults={'issued_by': self.request.user})


@extend_schema_view(
    get=extend_schema(tags=['Shop'])
)
class ReceiptView(generics.RetrieveAPIView):
    serializer_class = ReceiptSerializer

    def get_object(self):
        order = get_object_or_404(Order, pk=self.kwargs['pk'])
        return get_object_or_404(Receipt, order=order)