from django.urls import path
from .views import RegistrationView, AuthTokenView, ProtectedRandomView, AdvertisementListView, UserNotificationListCreateAPIView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)



urlpatterns = [
    path('ads/', AdvertisementListView.as_view(), name='advertisement_list'),
    path('register/', RegistrationView.as_view(), name='register'),
    path('auth/', AuthTokenView.as_view(), name='auth_token'),
    path('random/', ProtectedRandomView.as_view(), name='random'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/<int:user_id>/notifications/', UserNotificationListCreateAPIView.as_view(), name='user-notifications'),
]
