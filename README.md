# My_Chatbot_Project

## Overview
This project is a chatbot application designed to guide users through a question-based flow for home improvement services. 
It uses a CSV file to determine the conversation flow and collects user information for service requests.

## Technologies Used
- Frontend: React with Vite
- Backend: FastAPI
- Database: SQLite
- AI Integration: OpenAI GPT-3.5-turbo

## Approach

### 1. CSV Integration
We used a CSV file to store the question flow and service IDs. The backend parses this file to guide the conversation dynamically.

### 2. Chatbot Flow
The chatbot follows these steps:
1. Bot asks questions based on the CSV file
2. User responds via buttons or text input
3. Bot determines the appropriate service ID
4. User fills out a form with personal information
5. Information is submitted and stored in the database

### 3. iframe Embedding
The chatbot is designed to be embedded in other websites via an iframe, with the ability to pass initialization parameters.



## Challenges Faced

1. **Dynamic Question Flow**: Implementing a flexible system to handle various question paths from the CSV was complex. We solved this by creating a recursive function to traverse the question tree.

2. **State Management**: Keeping track of the conversation state, especially with the option to reset, required careful state management in React.

3. **OpenAI Integration**: Balancing between pre-defined responses and AI-generated content was challenging. We implemented a hybrid approach where the AI fills in gaps in the conversation.

4. **iframe Communication**: Enabling the chatbot to receive parameters when embedded in an iframe required additional considerations for cross-origin communication.



## Testing Approach

1. **Unit Testing**: We wrote unit tests for critical functions, especially those parsing the CSV and determining the next question.

2. **Integration Testing**: We tested the interaction between the frontend and backend, ensuring data was correctly passed and processed.

3. **User Flow Testing**: We created test scenarios covering various user paths through the chatbot to ensure all flows worked as expected.

4. **Performance Testing**: We simulated multiple concurrent users to ensure the system could handle the expected load.


## Setup and Running the Project

1. Clone the repository
2. Install dependencies:
	npm install  # For frontend
	pip install -r requirements.txt  # For backend
3. Set up environment variables (see `.env.example`)
4. Run the backend:
	uvicorn main:app --reload
5. Run the frontend:
	npm run dev


## Future Improvements

- Implement multi-language support
- Add more sophisticated error handling and recovery mechanisms
- Enhance accessibility features