from django.urls import path
from .views import (
    LoginView, LogoutView,
    UserListCreateView, UserRetrieveUpdateDestroyView,
    MyProfileView, ClientProfileUpdateView,
    TrainerListView, TrainerDetailView, TrainerPlansView,
    MembershipPlanListCreateView, MembershipPlanDetailView,
    ClientMembershipListCreateView, ClientMembershipDetailView,
    PaymentListCreateView, PaymentDetailView,
    TrainingPlanListCreateView, TrainingPlanDetailView,
    TrainingWeekCreateView, TrainingDayListCreateView, TrainingDayDetailView,
    ExerciseCreateView, ExerciseDetailView,
    ClientTrainingPlanListCreateView, MyTrainingPlanView, TodayTrainingView,
    CategoryListCreateView, ProductListCreateView, ProductDetailView,
    CartView, CartItemAddView, CartItemUpdateView, CartItemDeleteView, CartClearView,
    CheckoutView, OrderListView, OrderDetailView, OrderStatusUpdateView, ReceiptView,
    MessageListView, ChatUsersView, ChatFileUploadView,
)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    path('admin/users/', UserListCreateView.as_view(), name='user-list-create'),
    path('admin/users/<int:pk>/', UserRetrieveUpdateDestroyView.as_view(), name='user-detail'),

    path('profile/', MyProfileView.as_view(), name='my-profile'),
    path('profile/client/', ClientProfileUpdateView.as_view(), name='client-profile-update'),

    path('trainers/', TrainerListView.as_view(), name='trainer-list'),
    path('trainers/<int:pk>/', TrainerDetailView.as_view(), name='trainer-detail'),
    path('trainers/<int:pk>/plans/', TrainerPlansView.as_view(), name='trainer-plans'),

    path('memberships/plans/', MembershipPlanListCreateView.as_view(), name='membership-plan-list'),
    path('memberships/plans/<int:pk>/', MembershipPlanDetailView.as_view(), name='membership-plan-detail'),
    path('memberships/', ClientMembershipListCreateView.as_view(), name='client-membership-list'),
    path('memberships/<int:pk>/', ClientMembershipDetailView.as_view(), name='client-membership-detail'),

    path('payments/', PaymentListCreateView.as_view(), name='payment-list'),
    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='payment-detail'),

    path('training/plans/', TrainingPlanListCreateView.as_view(), name='training-plan-list'),
    path('training/plans/<int:pk>/', TrainingPlanDetailView.as_view(), name='training-plan-detail'),
    path('training/plans/<int:plan_id>/weeks/', TrainingWeekCreateView.as_view(), name='training-week-create'),
    path('training/plans/<int:plan_id>/days/', TrainingDayListCreateView.as_view(), name='training-day-list'),
    path('training/days/<int:pk>/', TrainingDayDetailView.as_view(), name='training-day-detail'),
    path('training/days/<int:day_id>/exercises/', ExerciseCreateView.as_view(), name='exercise-create'),
    path('training/exercises/<int:pk>/', ExerciseDetailView.as_view(), name='exercise-detail'),
    path('training/assigned/', ClientTrainingPlanListCreateView.as_view(), name='client-training-plan-list'),
    path('training/my-plan/', MyTrainingPlanView.as_view(), name='my-training-plan'),
    path('training/my-plan/today/', TodayTrainingView.as_view(), name='today-training'),

    path('shop/categories/', CategoryListCreateView.as_view(), name='category-list'),
    path('shop/products/', ProductListCreateView.as_view(), name='product-list'),
    path('shop/products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('shop/cart/', CartView.as_view(), name='cart'),
    path('shop/cart/add/', CartItemAddView.as_view(), name='cart-add'),
    path('shop/cart/items/<int:pk>/', CartItemUpdateView.as_view(), name='cart-item-update'),
    path('shop/cart/items/<int:pk>/delete/', CartItemDeleteView.as_view(), name='cart-item-delete'),
    path('shop/cart/clear/', CartClearView.as_view(), name='cart-clear'),
    path('shop/checkout/', CheckoutView.as_view(), name='checkout'),
    path('shop/orders/', OrderListView.as_view(), name='order-list'),
    path('shop/orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('shop/orders/<int:pk>/status/', OrderStatusUpdateView.as_view(), name='order-status-update'),
    path('shop/orders/<int:pk>/receipt/', ReceiptView.as_view(), name='receipt'),
    path('chat/messages/<int:user_id>/', MessageListView.as_view(), name='message-list'),
    path('chat/users/', ChatUsersView.as_view(), name='chat-users'),
    path('chat/upload/', ChatFileUploadView.as_view(), name='chat-upload'),
]