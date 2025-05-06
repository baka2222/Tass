from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import ClientUser, Notification, Advertisement
from image_cropping import ImageCroppingMixin


@admin.register(Advertisement)
class AdvertisementAdmin(ImageCroppingMixin, admin.ModelAdmin):
    list_display = ('id', 'title', 'created_at')
    search_fields = ('title',)


@admin.register(ClientUser)
class ClientUserAdmin(UserAdmin):
    model = ClientUser
    list_display = ('phone_number', 'is_staff', 'is_superuser')
    search_fields = ('phone_number',)
    ordering = ('phone_number',)
    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'password1', 'password2', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject', 'created_at', 'is_read')
    search_fields = ('subject', 'message')
    list_filter = ('is_read', 'created_at')