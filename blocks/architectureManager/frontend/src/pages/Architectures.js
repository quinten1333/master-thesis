import React from 'react';
import { Table, Button, Modal, Tabs, Tab } from 'react-bootstrap'

import api from '../api.js';

class Architectures extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      architectures: {},
      popup: null,
    }
  }

  async componentDidMount() {
    const architectures = await api.architecture.getAll();
    this.setState({ architectures });
  }

  async activate(id, state) {
    await api.architecture.setActive(id, state);
    this.setState({ architectures: { ...this.state.architectures, [id]: await api.architecture.get(id) } });
  }

  viewIO = async (id) => {
    const arch = this.state.architectures[id];
    if (!arch) { return; }

    const tabs = [];
    for (const service in arch.IOConfig) {
      tabs.push(
        <Tab key={service} title={service} eventKey={service}>
          <pre>
            {JSON.stringify(arch.IOConfig[service], null, 2)}
          </pre>
        </Tab>
      )
    }

    const popup = (
      <Modal show={true} onHide={() => this.setState({ popup: null })} fullscreen>
        <Modal.Header closeButton>{arch.name} - IOConfig</Modal.Header>
        <Modal.Body>
          <Tabs>
            {tabs}
          </Tabs>
        </Modal.Body>
      </Modal>
    )

    this.setState({ popup })
  }

  copySource = async (steps, e) => {
    const source = await api.userStories.draw(steps, 'text');
    await navigator.clipboard.writeText(source);
    e.target.innerText = 'Copied!'
  }

  viewCFG = async (id) => {
    const arch = this.state.architectures[id];
    if (!arch) { return; }

    const tabs = [];
    for (const pid in arch.pipelines) {
      const pipeline = arch.pipelines[pid];
      const image = (await api.userStories.draw(pipeline.steps));

      tabs.push(
        <Tab key={pid} title={pid} eventKey={pid}>
          <Button onClick={(e) => this.copySource(pipeline.steps, e)} style={{ position: 'absolute', right: 0, top: 0 }}>Copy source</Button>
          <img src={image} />
        </Tab>
      )
    }

    const popup = (
      <Modal show={true} onHide={() => this.setState({ popup: null })} fullscreen>
        <Modal.Header closeButton>{arch.name} - Control flow graph</Modal.Header>
        <Modal.Body>
          <Tabs style={{ position: 'relative' }}>
            {tabs}
          </Tabs>
        </Modal.Body>
      </Modal>
    )

    this.setState({ popup })
  }

  renderRow = ([id, row]) => {
    return (
      <tr key={id}>
        <td>{id}</td>
        <td>{row.name}</td>
        <td>{row.endpoint}</td>
        <td>{row.state ? 'Active' : 'Inactive'}</td>
        <td><Button onClick={() => this.activate(id, row.state > 0 ? false : true)}>{row.state ? 'Deactivate' : 'Activate'}</Button></td>
        <td><Button onClick={() => this.viewIO(id)}>Open</Button></td>
        <td><Button onClick={() => this.viewCFG(id)}>Open</Button></td>
      </tr>
    )
  }

  render() {
    return (
      <>
        <Table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Endpoint</th>
              <th>State</th>
              <th>Actions</th>
              <th>IO Config</th>
              <th>CFG</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(this.state.architectures).map(this.renderRow)}
          </tbody>
        </Table>
        {this.state.popup ? this.state.popup : null}
      </>
    );
  }
}

export default Architectures;
