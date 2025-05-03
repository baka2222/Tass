from django.urls import path
from .views import RegistrationView, AuthTokenView, ProtectedRandomView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)



urlpatterns = [
    path('register/', RegistrationView.as_view(), name='register'),
    path('auth/', AuthTokenView.as_view(), name='auth_token'),
    path('random/', ProtectedRandomView.as_view(), name='random'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
