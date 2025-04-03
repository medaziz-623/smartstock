"""
WSGI config for smart_stock_backend_new project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
import sys

path = '/home/azizl/smartstock'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'smart_stock_backend_new.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()