from django.urls import path
from .views import (
    StoreLikeAddView,
    StoreLikeRemoveView,
    StoreListGroupedByCategoryView,
    StoreDetailView,
)

urlpatterns = [
    path('stores/', StoreListGroupedByCategoryView.as_view(), name='store-list'),
    path('stores/<int:store_id>/like/', StoreLikeAddView.as_view(), name='store-like'),
    path('stores/<int:store_id>/unlike/', StoreLikeRemoveView.as_view(), name='store-unlike'),
    path('stores/<int:store_id>/', StoreDetailView.as_view(), name='store-detail'),
]