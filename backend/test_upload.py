import requests

# YOUR TOKEN FROM SHELL (sneha user)
TOKEN = "235096adfb59d611e7ba50f1359cd1023e97a789" 

url = "http://127.0.0.1:8000/api/upload/"
headers = {"Authorization": f"Token {TOKEN}"}

# Test with sample CSV (or any CSV file)
with open("sample_equipment_data.csv", "rb") as f:  # Put CSV in backend folder
    files = {"file": f}
    response = requests.post(url, headers=headers, files=files)

print(response.status_code)
print(response.json())
