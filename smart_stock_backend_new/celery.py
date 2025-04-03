from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_stock_backend_new.settings')
app = Celery('smart_stock_backend_new')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()