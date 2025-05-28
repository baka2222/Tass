from django.db import models
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.utils import timezone
from image_cropping import ImageRatioField
from django.dispatch import receiver
from django.db.models.signals import post_save
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
    name = models.CharField(
        max_length=255,
        help_text="Full name of the user",
        null=True,
        blank=True
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
        help_text="Client receiving this notification",
        null=True,
        blank=True
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

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'

    def __str__(self):
        return f"{self.subject}"
    

@receiver(post_save, sender=Notification)
def broadcast_notification(sender, instance, created, **kwargs):
    if created and instance.user is None:
        users = ClientUser.objects.filter(is_active=True).values_list('pk', flat=True)
        bulk = []
        for uid in users:
            bulk.append(Notification(
                user_id=uid,
                subject=instance.subject,
                message=instance.message,
                created_at=instance.created_at,
                is_read=False
            ))
        instance.delete()
        Notification.objects.bulk_create(bulk)
    

class Advertisement(models.Model):
    title = models.CharField(max_length=255, help_text="Название рекламы (необязательно)", null=True, blank=True)
    image = models.ImageField(upload_to='ads/', help_text="Изображение (желательно 3:1)")
    cropping = ImageRatioField('image', '900x300')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Реклама'
        verbose_name_plural = 'Рекламы'

    def __str__(self):
        return self.title or f'Ad #{self.pk}'