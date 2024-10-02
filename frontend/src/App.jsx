import React from 'react';
import { ChakraProvider, Box, VStack, Heading } from '@chakra-ui/react';
import Chatbot from './components/Chatbot';

function App() {
  return (
    <ChakraProvider>
      <Box textAlign="center" fontSize="xl">
        <VStack spacing={8}>
          <Heading>Chatbot Application</Heading>
          <Chatbot />
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;