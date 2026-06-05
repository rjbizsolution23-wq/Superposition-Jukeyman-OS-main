// packages/mobile/mobile-app/App.tsx — Mobile control interface
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Provider as PaperProvider, Appbar, Card, Title, Paragraph, Button, TextInput, Chip } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [agentStatus, setAgentStatus] = useState('offline');
  const [command, setCommand] = useState('');
  const [results, setResults] = useState([]);

  const sendCommand = async () => {
    try {
      // Call SUPREME-OPERATOR API
      const response = await fetch('https://supreme-operator-api.com/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, risk_tier: 'yellow' })
      });
      const result = await response.json();
      setResults(prev => [...prev, { command, result, timestamp: new Date() }]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getStatus = async () => {
    try {
      const response = await fetch('https://supreme-operator-api.com/status');
      const status = await response.json();
      setAgentStatus(status.status);
    } catch {
      setAgentStatus('offline');
    }
  };

  useEffect(() => {
    getStatus();
    const interval = setInterval(getStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="SUPREME OPERATOR" subtitle="Mobile Control" />
          <Chip mode="outlined" style={styles.statusChip}>
            {agentStatus.toUpperCase()}
          </Chip>
        </Appbar.Header>

        <ScrollView style={styles.scrollView}>
          <Card style={styles.card}>
            <Card.Content>
              <Title>Agent Control</Title>
              <TextInput
                label="Command"
                value={command}
                onChangeText={setCommand}
                multiline
                numberOfLines={3}
                style={styles.input}
              />
              <Button mode="contained" onPress={sendCommand} style={styles.button}>
                Execute Command
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>Quick Actions</Title>
              <View style={styles.buttonRow}>
                <Button mode="outlined" onPress={() => setCommand('build website for client')}>
                  Build Website
                </Button>
                <Button mode="outlined" onPress={() => setCommand('deploy to production')}>
                  Deploy App
                </Button>
                <Button mode="outlined" onPress={() => setCommand('check server health')}>
                  Server Health
                </Button>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>Command History</Title>
              {results.slice(-5).reverse().map((item, index) => (
                <Paragraph key={index} style={styles.result}>
                  <Text style={styles.timestamp}>{item.timestamp.toLocaleTimeString()}</Text>
                  {'\n'}{item.command}
                  {'\n'}Result: {JSON.stringify(item.result)}
                </Paragraph>
              ))}
            </Card.Content>
          </Card>
        </ScrollView>

        <StatusBar style="auto" />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1, padding: 10 },
  card: { marginBottom: 10 },
  input: { marginBottom: 10 },
  button: { marginTop: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statusChip: { backgroundColor: 'green' },
  result: { marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 },
  timestamp: { fontSize: 12, color: '#666' }
});