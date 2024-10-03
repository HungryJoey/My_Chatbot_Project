import { useState, useEffect, useRef } from 'react';
import { 
  Box, VStack, Text, Button, Input, FormControl, FormErrorMessage, useToast, 
  HStack, Flex, Select, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, 
  ModalFooter, ModalBody, ModalCloseButton 
} from '@chakra-ui/react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

function Chatbot() {
  // State variables
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [iframeParams, setIframeParams] = useState({});
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    zipcode: '',
    address: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const messagesEndRef = useRef(null);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle iframe parameters
  useEffect(() => {
    const getUrlParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const params = {};
      for (let [key, value] of searchParams) {
        params[key] = value;
      }
      return params;
    };

    const params = getUrlParams();
    setIframeParams(params);

    // Initialize chat with category from URL if provided
    if (params.category_id) {
      const categoryId = Number(params.category_id);
      setSelectedCategory(categoryId);
      handleCategorySelect(categoryId);
    }
  }, []);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle category selection
  const handleCategorySelect = async (categoryId) => {
    try {
      const response = await axios.get(`${API_URL}/next_question/${categoryId}`);
      const aiMessage = { role: 'assistant', content: response.data.question };
      setMessages([aiMessage]);
      setOptions(response.data.options);
    } catch (error) {
      console.error('Error fetching first question:', error);
      toast({
        title: "Error",
        description: "Failed to load the first question. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle sending messages (user input or selected options)
  const handleSend = async (message = input) => {
    if (message.trim()) {
      const userMessage = { role: 'user', content: message };
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInput('');
      setIsLoading(true);
      setIsTyping(true);
  
      try {
        const response = await axios.post(`${API_URL}/chat`, {
          message: message,
          category_id: selectedCategory,
          context: messages
        });

        setIsTyping(false);
        const aiMessage = { role: 'assistant', content: response.data.message };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
  
        if (response.data.show_form) {
          setShowForm(true);
          setServiceId(response.data.service_id);
        }
  
        if (response.data.next_question) {
          const nextQuestionMessage = { role: 'assistant', content: response.data.next_question };
          setMessages(prevMessages => [...prevMessages, nextQuestionMessage]);
          setOptions(response.data.options || []);
        } else {
          setOptions([]);
        }
  
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
    }
  };

  // Handle option button clicks
  const handleOptionClick = (option) => {
    handleSend(option);
  };

  // Handle changes in personal information form
  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        const response = await axios.post(`${API_URL}/submit_personal_info`, {
          ...personalInfo,
          service_id: serviceId
        });
        toast({
          title: "Success",
          description: response.data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setShowForm(false);
        setMessages([]);
        setSelectedCategory(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to submit information. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        console.error('Error submitting personal info:', error);
      }
    }
  };

  // Reset the conversation
  const resetConversation = () => {
    setMessages([]);
    setSelectedCategory(null);
    setShowForm(false);
    setInput('');
    setPersonalInfo({
      name: '',
      email: '',
      zipcode: '',
      address: '',
      phone: ''
    });
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!/^\d{5}(-\d{4})?$/.test(personalInfo.zipcode)) {
      newErrors.zipcode = "Invalid zipcode format";
    }
    if (!/^\d{10}$/.test(personalInfo.phone.replace(/\D/g,''))) {
      newErrors.phone = "Invalid phone number format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle confirmation before submitting form
  const handleConfirmSubmit = () => {
    if (validateForm()) {
      setIsConfirmOpen(true);
    }
  };

  // Handle final submission after confirmation
  const handleFinalSubmit = () => {
    setIsConfirmOpen(false);
    handleSubmit();
  };

  // Error message component
  const ErrorMessage = ({ message }) => (
    <Box color="red.500" mt={2}>
      <Text fontSize="sm">{message}</Text>
    </Box>
  );

  // Render component
  return (
    <Box width="100%" height="90vh" display="flex" justifyContent="center" alignItems="center" bg="transparent">
      <Box width="400px" maxHeight="80vh" overflow="auto" p={4} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
        <VStack spacing={4} align="stretch">
          {/* Category selection dropdown */}
          <Select 
            size="sm"
            placeholder="Select a category"
            onChange={(e) => {
              const categoryId = Number(e.target.value);
              setSelectedCategory(categoryId);
              handleCategorySelect(categoryId);
            }}
          >
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </Select>

          {/* Chat messages and options */}
          <Box height="300px" overflowY="auto" p={3} bg="gray.50" borderRadius="md">
            {messages.map((message, index) => (
              <Flex key={index} direction="column" mb={2}>
                <Box 
                  alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                  maxWidth="70%" 
                  bg={message.role === 'user' ? 'blue.100' : 'green.100'} 
                  color={message.role === 'user' ? 'blue.800' : 'green.800'}
                  p={2} 
                  borderRadius="lg"
                  fontSize="sm"
                >
                  <Text>{message.content}</Text>
                </Box>
                {message.role === 'assistant' && options.length > 0 && index === messages.length - 1 && (
                  <Flex wrap="wrap" justifyContent="flex-start" mt={2}>
                    {options.map((option, optionIndex) => (
                      <Button
                        key={optionIndex}
                        size="xs"
                        onClick={() => handleOptionClick(option)}
                        m={1}
                        colorScheme="teal"
                        variant="outline"
                        _hover={{ bg: 'teal.50' }}
                      >
                        {option}
                      </Button>
                    ))}
                  </Flex>
                )}
              </Flex>
            ))}
            {isTyping && (
              <Flex justifyContent="flex-start" mb={2}>
                <Box bg="gray.100" p={2} borderRadius="lg">
                  <Text fontSize="xs">AI is typing...</Text>
                </Box>
              </Flex>
            )}
            {isLoading && (
              <Flex justifyContent="center" my={2}>
                <Spinner size="sm" color="teal.500" />
              </Flex>
            )}
            <Box ref={messagesEndRef} />
          </Box>
    
          {/* User input area */}
          {!showForm && (
            <VStack>
              <Input
                size="sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button size="sm" onClick={() => handleSend()} isDisabled={isLoading || input.trim() === ''} width="100%">Send</Button>
            </VStack>
          )}
    
          {/* Personal information form */}
          {showForm && (
            <Box as="form" onSubmit={handleSubmit} p={3} borderWidth={1} borderRadius="md">
              <VStack spacing={3}>
                <Text fontSize="sm"><strong>Service ID:</strong> {serviceId}</Text>
                <Input size="sm" name="name" placeholder="Name" value={personalInfo.name} onChange={handlePersonalInfoChange} required />
                <Input size="sm" name="email" type="email" placeholder="Email" value={personalInfo.email} onChange={handlePersonalInfoChange} required />
                {errors.email && <ErrorMessage message={errors.email} />}
                <Input size="sm" name="zipcode" placeholder="Zipcode" value={personalInfo.zipcode} onChange={handlePersonalInfoChange} required />
                <Input size="sm" name="address" placeholder="Address" value={personalInfo.address} onChange={handlePersonalInfoChange} required />
                <Input size="sm" name="phone" type="tel" placeholder="Phone Number" value={personalInfo.phone} onChange={handlePersonalInfoChange} required />
                <Button size="sm" type="button" colorScheme="blue" onClick={handleConfirmSubmit} width="100%">Submit</Button>
              </VStack>
            </Box>
          )}

          {/* Reset conversation button */}
          <Button size="sm" onClick={() => setIsResetConfirmOpen(true)} colorScheme="red" width="100%">
             Reset Conversation
          </Button>

          {/* Reset confirmation modal */}
          <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Confirm Reset</ModalHeader>
              <ModalBody>
                Are you sure you want to reset the conversation? This action cannot be undone.
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="red" mr={3} onClick={() => {
                  resetConversation();
                  setIsResetConfirmOpen(false);
                }}>
                  Reset
                </Button>
                <Button variant="ghost" onClick={() => setIsResetConfirmOpen(false)}>Cancel</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
          
          {/* Submission confirmation modal */}
          <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Confirm Submission</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm"><strong>Name:</strong> {personalInfo.name}</Text>
                  <Text fontSize="sm"><strong>Email:</strong> {personalInfo.email}</Text>
                  <Text fontSize="sm"><strong>Zipcode:</strong> {personalInfo.zipcode}</Text>
                  <Text fontSize="sm"><strong>Address:</strong> {personalInfo.address}</Text>
                  <Text fontSize="sm"><strong>Phone:</strong> {personalInfo.phone}</Text>
                  <Text fontSize="sm"><strong>Service ID:</strong> {serviceId}</Text>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="blue" mr={3} onClick={handleFinalSubmit}>
                  Confirm
                </Button>
                <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </Box>
    </Box>
  );
}

export default Chatbot;