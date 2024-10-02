import requests
import json

BASE_URL = "http://localhost:8000"

def test_chatbot_flow():
    # Step 1: Get categories
    response = requests.get(f"{BASE_URL}/categories")
    categories = response.json()
    print("Categories:", categories)

    # Step 2: Start a chat for a specific category
    category_id = categories[0]['category_id']
    chat_data = {
        "message": "I need help with home improvement",
        "category_id": category_id,
        "context": []
    }
    response = requests.post(f"{BASE_URL}/chat", json=chat_data)
    chat_result = response.json()
    print("Chat response:", chat_result)

    # Step 3: Continue chat until service is determined
    while not chat_result.get('service_id'):
        chat_data['message'] = input("Your response: ")
        chat_data['context'].append({"role": "assistant", "content": chat_result['message']})
        chat_data['context'].append({"role": "user", "content": chat_data['message']})
        response = requests.post(f"{BASE_URL}/chat", json=chat_data)
        chat_result = response.json()
        print("AI:", chat_result['message'])

    # Step 4: Submit personal information
    personal_info = {
        "name": "John Doe",
        "email": "john@example.com",
        "zipcode": "12345",
        "address": "123 Main St",
        "phone": "1234567890",
        "service_id": chat_result['service_id']
    }
    response = requests.post(f"{BASE_URL}/submit_personal_info", json=personal_info)
    result = response.json()
    print("Submission result:", result)

if __name__ == "__main__":
    test_chatbot_flow()