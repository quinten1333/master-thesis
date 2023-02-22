import React from 'react';
import { Table, Button } from 'react-bootstrap'

import api from '../api.js';

class Architectures extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      architectures: {},
    }
  }

  async componentDidMount() {
    const architectures = await api.architecture.getAll();
    this.setState({ architectures });
  }

  async activate(id, state) {
    await api.architecture.setActive(id, state);
    const newArchitectures = {...this.state.architectures};
    newArchitectures[id] = await api.architecture.get(id);

    this.setState({ architectures: newArchitectures });
  }

  renderRow = ([id, row]) => {
    return (
      <tr key={id}>
        <td>{id}</td>
        <td>{row.name}</td>
        <td>{row.endpoint}</td>
        <td>{row.state ? 'Active' : 'Inactive'}</td>
        <td><Button onClick={() => this.activate(id, row.state > 0 ? 0 : 1)}>{row.state ? 'Deactivate' : 'Activate'}</Button></td>
      </tr>
    )
  }

  render() {
    return (
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Endpoint</th>
            <th>State</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(this.state.architectures).map(this.renderRow)}
        </tbody>
      </Table>
    );
  }
}

export default Architectures;
