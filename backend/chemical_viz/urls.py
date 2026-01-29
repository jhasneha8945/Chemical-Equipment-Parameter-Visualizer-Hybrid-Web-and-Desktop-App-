from django.contrib import admin
from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token  
from equipment.views import UploadCSV, SummaryList, GeneratePDF

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    path('api/upload/', UploadCSV.as_view()),
    path('api/history/', SummaryList.as_view()),
    path('api/pdf/<int:pk>/', GeneratePDF.as_view()),
]
