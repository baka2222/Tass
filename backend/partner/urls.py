from django.urls import path, include
from .views import (
    StoreLikeAddView,
    StoreLikeRemoveView,
    StoreListGroupedByCategoryView,
    StoreDetailView,
    PartnerViewSet,
    CourierViewSet,
    OrderViewSet,
    PromoCodeViewSet,
    OrderClientViewSet,
    OrderByUserId,
    OrderClientByUserId,
    CreateStoreOrderPayment,
    StoreOrderPaymentStatus,
    CreateClientOrderPayment, 
    ClientOrderPaymentStatus,
    current_user
)
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register(r'partners', PartnerViewSet)
router.register(r'couriers', CourierViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'promocodes', PromoCodeViewSet)
router.register(r'orders_client', OrderClientViewSet)


urlpatterns = [
    path('stores/', StoreListGroupedByCategoryView.as_view(), name='store-list'),
    path('stores/<int:store_id>/like/', StoreLikeAddView.as_view(), name='store-like'),
    path('stores/<int:store_id>/unlike/', StoreLikeRemoveView.as_view(), name='store-unlike'),
    path('stores/<int:store_id>/', StoreDetailView.as_view(), name='store-detail'),
    path('auth/users/me/', current_user),
    path('orders/user/<int:user_id>/', OrderByUserId.as_view(), name='order-by-user'),
    path('couriers/user/<int:user_id>/', OrderClientByUserId.as_view(), name='order-client-by-user'),
    # Магазины
    path('payments/store/create/', CreateStoreOrderPayment.as_view(), name='store-pay-create'),
    path('payments/store/status/', StoreOrderPaymentStatus.as_view(), name='store-pay-status'),
    # Клиенты
    path('payments/client/create/', CreateClientOrderPayment.as_view(), name='client-pay-create'),
    path('payments/client/status/', ClientOrderPaymentStatus.as_view(), name='client-pay-status'),
    path('', include(router.urls)),
]