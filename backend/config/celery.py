import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.conf.enable_utc = False
app.conf.update(timezone='Asia/Bishkek')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()