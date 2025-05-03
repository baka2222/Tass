from django.db import models
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.utils import timezone


class ClientUserManager(BaseUserManager):
    def create_user(self, phone_number, **extra_fields):
        if not phone_number:
            raise ValueError('The Phone number must be set')
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(phone_number, **extra_fields)


class ClientUser(AbstractBaseUser, PermissionsMixin):
    phone_number = models.CharField(
        max_length=15,
        unique=True,
        help_text="Phone number in international format, e.g. '+1234567890'",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = ClientUserManager()

    def __str__(self):
        return self.phone_number
    
    class Meta:
        verbose_name = 'Юзер'
        verbose_name_plural = 'Юзеры'


class Notification(models.Model):
    user = models.ForeignKey(
        ClientUser,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="Client receiving this notification"
    )
    subject = models.CharField(
        max_length=255,
        help_text="Тема сообщения"
    )
    message = models.TextField(
        help_text="Текст уведомления"
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text="Дата и время создания уведомления"
    )
    is_read = models.BooleanField(
        default=False,
        help_text="Признак прочтения"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведромления'

    def __str__(self):
        return f"{self.subject} to {self.user.phone_number}"
