import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import Chatbot from './Chatbot';

function EmbeddedChatbot() {
  return (
    <ChakraProvider>
      <Chatbot />
    </ChakraProvider>
  );
}

export default EmbeddedChatbot;