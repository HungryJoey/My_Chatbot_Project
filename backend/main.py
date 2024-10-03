from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from dotenv import load_dotenv
from datetime import datetime
import logging
import pandas as pd
import openai
import os



load_dotenv()  # Load environment variables from .env file


app = FastAPI() # Create FastAPI app instance


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Update this to match your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Print current working directory and its contents
print("Current working directory:", os.getcwd())
print("Contents of the current directory:", os.listdir())

# Load the CSV file
try:
    df = pd.read_csv(os.path.join(os.getcwd(), 'corrected_final_home_improvement_services.csv'))
    print("CSV file loaded successfully")
except FileNotFoundError as e:
    print(f"Error: {e}")
    raise HTTPException(status_code=500, detail=f"CSV file not found. Error: {str(e)}")
except Exception as e:
    print(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail=f"Error loading CSV file: {str(e)}")

# Set up OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")

print(f"API Key: {openai.api_key[:5]}...")  # Print first 5 characters of the API key

# Set up database engine and session
Base = declarative_base()
engine = create_engine('sqlite:///chatbot.db', echo=True)
Session = sessionmaker(bind=engine)


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define 'Submission' table schema
class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    zipcode = Column(String)
    address = Column(String)
    phone = Column(String)
    service_id = Column(Integer)
    submitted_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

# Model for chat input with optional category and context
class ChatInput(BaseModel):
    message: str
    category_id: Optional[int] = None
    context: Optional[List[dict]] = []

# Model representing a service with associated category and question funnel
class Service(BaseModel):
    category_id: int
    category_name: str
    service_id: int
    question_funnel: str

# Model representing a service category
class Category(BaseModel):
    category_id: int
    category_name: str

# Model representing a question with multiple choice options
class Question(BaseModel):
    question: str
    options: List[str]

# Model representing a user's personal information
class PersonalInfo(BaseModel):
    name: str
    email: EmailStr
    zipcode: str
    address: str
    phone: str
    service_id: int

@app.post("/chat")
async def chat(chat_input: ChatInput):
    try:
        # Get the current question
        current_question = get_current_question(chat_input.category_id, chat_input.context)
        
        # Prepare system message
        system_message = get_system_message(chat_input.category_id)
        
        # Prepare messages for OpenAI
        messages = [
            {"role": "system", "content": system_message},
            {"role": "system", "content": f"The current question is: {current_question}"}
        ] + chat_input.context + [{"role": "user", "content": chat_input.message}]

        # Get completion from OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=150
        )

        ai_message = response.choices[0].message['content']

        # Determine next steps
        next_question, options = determine_next_question(chat_input.category_id, chat_input.context, ai_message)
        show_form = should_show_form(chat_input.context, ai_message)
        service_id = get_service_id(chat_input.category_id, chat_input.context, ai_message) if show_form else None

        return {
            "message": ai_message,
            "show_form": show_form,
            "next_question": next_question,
            "options": options,
            "service_id": service_id
        }

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

def get_current_question(category_id, context):
    if not context:
        return get_first_question(category_id)
    return context[-1]['content'] if context[-1]['role'] == 'assistant' else None

def get_first_question(category_id):
    services = df[df['Category ID'] == category_id]
    if not services.empty:
        return services['Question Funnel'].iloc[0].split(' > ')[0]
    return None

def get_system_message(category_id, current_question):
    category_name = df[df['Category ID'] == category_id]['Category Name'].iloc[0]
    return f"You are a helpful assistant for {category_name}. The current question is: {current_question}"

def determine_next_question(category_id, context, ai_message):
    services = df[df['Category ID'] == category_id]
    current_question = get_current_question(category_id, context)
    
    if current_question:
        question_parts = services['Question Funnel'].str.split(' > ')
        next_questions = [parts[parts.index(current_question) + 1] for parts in question_parts if current_question in parts]
        
        if next_questions:
            next_question = next_questions[0]
            options = services[services['Question Funnel'].str.contains(next_question)]['Question Funnel'].str.split(' > ').str[-1].unique().tolist()
            return next_question, options
    
    return None, []

def should_show_form(context, ai_message):
    return len(context) >= 4 or "final recommendation" in ai_message.lower()

def get_service_id(category_id, context, ai_message):
    services = df[df['Category ID'] == category_id]
    for _, service in services.iterrows():
        if all(q.lower() in ' '.join([m['content'].lower() for m in context] + [ai_message.lower()]) for q in service['Question Funnel'].split(' > ')):
            return service['Service ID']
    return None

def get_system_message(category_id):
    category_name = df[df['Category ID'] == category_id]['Category Name'].iloc[0] if not df[df['Category ID'] == category_id].empty else "Unknown category"
    return f"You are a helpful assistant for {category_name}."

def should_show_form(context, ai_message):
    # Logic to determine if we should show the form
    # This could be based on the number of messages, specific keywords, etc.
    if len(context) >= 4 or "final recommendation" in ai_message.lower():
        return True
    return False

def get_next_question(category_id, context, ai_message):
    # Logic to determine the next question based on the category and conversation flow
    if "what type of" in ai_message.lower():
        return ai_message
    return None

@app.post("/submit_personal_info")
async def submit_personal_info(info: PersonalInfo):
    try:
        session = Session()
        new_submission = Submission(
            name=info.name,
            email=info.email,
            zipcode=info.zipcode,
            address=info.address,
            phone=info.phone,
            service_id=info.service_id
        )
        session.add(new_submission)
        session.commit()
        session.close()
        return {"message": "Information submitted successfully"}
    except Exception as e:
        print(f"Error in submit_personal_info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def determine_service(category_id, conversation):
    # Implement logic to determine the service based on the conversation and category
    # This is a placeholder implementation
    services = df[df['Category ID'] == category_id]
    if len(services) == 1:
        return services.iloc[0]
    
    # Add more complex logic here based on your specific requirements
    return None

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Chatbot API"}

@app.get("/categories", response_model=List[Category])
async def get_categories():
    categories = df[['Category ID', 'Category Name']].drop_duplicates().to_dict('records')
    return [Category(category_id=cat['Category ID'], category_name=cat['Category Name']) for cat in categories]

@app.get("/services/{category_id}", response_model=List[Service])
async def get_services_by_category(category_id: int):
    services = df[df['Category ID'] == category_id].to_dict('records')
    if not services:
        raise HTTPException(status_code=404, detail="Category not found")
    return [Service(
        category_id=service['Category ID'],
        category_name=service['Category Name'],
        service_id=service['Service ID'],
        question_funnel=service['Question Funnel']
    ) for service in services]

@app.get("/next_question/{category_id}", response_model=Question)
async def get_next_question(category_id: int, current_question: Optional[str] = None):
    services = df[df['Category ID'] == category_id]
    if services.empty:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if current_question is None:
        # First question
        first_question = services['Question Funnel'].iloc[0].split(' > ')[0]
        options = services['Question Funnel'].apply(lambda x: x.split(' > ')[1]).unique().tolist()
        return Question(question=first_question, options=options)
    else:
        # Find the next question
        current_services = services[services['Question Funnel'].str.contains(current_question)]
        if current_services.empty:
            raise HTTPException(status_code=404, detail="No more questions")
        
        next_questions = current_services['Question Funnel'].apply(lambda x: x.split(' > ')[x.split(' > ').index(current_question) + 1])
        if next_questions.empty:
            raise HTTPException(status_code=404, detail="No more questions")
        
        next_question = next_questions.iloc[0]
        options = current_services['Question Funnel'].apply(lambda x: x.split(' > ')[x.split(' > ').index(next_question) + 1]).unique().tolist()
        return Question(question=next_question, options=options)

@app.get("/final_service", response_model=Service)
async def get_final_service(category_id: int, answers: str):
    services = df[df['Category ID'] == category_id]
    if services.empty:
        raise HTTPException(status_code=404, detail="Category not found")
    
    matching_service = services[services['Question Funnel'].str.contains(answers, case=False, regex=False)]
    if matching_service.empty:
        raise HTTPException(status_code=404, detail="No matching service found")
    
    service = matching_service.iloc[0]
    return Service(
        category_id=service['Category ID'],
        category_name=service['Category Name'],
        service_id=service['Service ID'],
        question_funnel=service['Question Funnel']
    )

@app.post("/submit_personal_info")
async def submit_personal_info(info: PersonalInfo):
    try:
        # Here you would typically save this information to a database
        # For now, we'll just print it and return a success message
        print(f"Received personal info: {info}")
        return {"message": "Information submitted successfully"}
    except Exception as e:
        print(f"Error in submit_personal_info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))