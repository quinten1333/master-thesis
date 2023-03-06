import React from 'react';
import { Container } from 'react-bootstrap';

import Architectures from './pages/Architectures.js';

class App extends React.Component {
  render() {
    return (
      <Container>
        <Architectures />
      </Container>
    );
  }
}

export default App;
