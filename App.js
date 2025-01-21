import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';
import { io } from 'socket.io-client';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const API_URL = 'http://192.168.1.8:5000';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('Work');
  const [reminderText, setReminderText] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('date');
  const [taskTypes, setTaskTypes] = useState(['Work', 'Personal', 'Shopping', 'Health', 'Other']);
  const [naturalInput, setNaturalInput] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchTasks();
    fetchTaskTypes();
    setupWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupWebSocket = () => {
    socketRef.current = io(API_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socketRef.current.on('new_task', async (newTask) => {
      console.log('Received new task:', newTask);
      setTasks(currentTasks => {
        // Check if task already exists
        const exists = currentTasks.some(task => task.id === newTask.id);
        if (exists) {
          return currentTasks;
        }
        // Schedule notification for the new task
        scheduleNotification(newTask);
        // Add new task and sort by notification time
        const updatedTasks = [...currentTasks, newTask]
          .sort((a, b) => new Date(a.notification_time) - new Date(b.notification_time));
        return updatedTasks;
      });
    });

    socketRef.current.on('delete_task', ({ id }) => {
      console.log('Task deleted:', id);
      setTasks(currentTasks => currentTasks.filter(task => task.id !== id));
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    socketRef.current.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  };

  const fetchTaskTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/task-types`);
      if (response.ok) {
        const types = await response.json();
        setTaskTypes(types);
      }
    } catch (error) {
      console.error('Error fetching task types:', error);
    }
  };

  async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Error', 'Failed to get push token for push notification!');
      return;
    }
  }

  const fetchTasks = async () => {
    try {
      console.log('Fetching tasks from:', `${API_URL}/api/tasks`);
      const response = await fetch(`${API_URL}/api/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched tasks:', data);
      
      // Schedule notifications for all future tasks
      for (const task of data) {
        await scheduleNotification(task);
      }
      
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert(
        'Error',
        'Failed to fetch tasks. Please check if the server is running and try again.'
      );
    }
  };

  const scheduleNotification = async (task) => {
    try {
      const trigger = new Date(task.notification_time);
      const currentTime = new Date();
      
      // Only schedule if the notification time is in the future
      if (trigger > currentTime) {
        console.log(`Scheduling notification for task: ${task.title} at ${trigger}`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: task.title,
            body: task.reminder_text,
          },
          trigger,
        });
        console.log('Notification scheduled successfully');
      } else {
        console.log(`Skipping notification for past task: ${task.title}`);
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const handleEnhanceTask = async () => {
    if (!naturalInput.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    try {
      setEnhancing(true);
      const response = await fetch(`${API_URL}/api/enhance-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: naturalInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance task');
      }

      const enhancedTask = await response.json();
      
      // Create the task directly
      const taskData = {
        title: enhancedTask.title,
        taskType: enhancedTask.taskType,
        notificationTime: enhancedTask.notificationTime,
        reminderText: enhancedTask.reminderText
      };

      const addResponse = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!addResponse.ok) {
        throw new Error('Failed to add task');
      }

      // Clear the input
      setNaturalInput('');
      
    } catch (error) {
      console.error('Error processing task:', error);
      Alert.alert('Error', 'Failed to process task. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleAddTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!reminderText.trim()) {
      Alert.alert('Error', 'Please enter a reminder message');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding task to:', `${API_URL}/api/tasks`);
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          taskType,
          notificationTime: date.toISOString(),
          reminderText: reminderText.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add task');
      }

      const newTask = await response.json();
      console.log('Added task:', newTask);
      await scheduleNotification(newTask);
      await fetchTasks();
      
      // Reset form
      setTitle('');
      setReminderText('');
      setDate(new Date());
      Alert.alert('Success', 'Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert(
        'Error',
        'Failed to add task. Please check if the server is running and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      console.log('Deleting task:', `${API_URL}/api/tasks/${taskId}`);
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      await fetchTasks();
      Alert.alert('Success', 'Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert(
        'Error',
        'Failed to delete task. Please check if the server is running and try again.'
      );
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
      if (Platform.OS === 'android' && mode === 'date') {
        setMode('time');
        setShowDatePicker(true);
      } else if (Platform.OS === 'android' && mode === 'time') {
        setMode('date');
      }
    }
  };

  const showDateTimePicker = () => {
    setMode('date');
    setShowDatePicker(true);
  };

  const getTaskTypeEmoji = (type) => {
    const emojis = {
      'Work': '💼',
      'Personal': '👤',
      'Shopping': '🛍️',
      'Health': '🏥',
      'Other': '📝'
    };
    return emojis[type] || '📝';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Task Scheduler 📝</Text>
        
        {/* AI Task Input */}
        <View style={styles.aiInputContainer}>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            placeholder="Describe your task naturally and press Enter..."
            value={naturalInput}
            onChangeText={setNaturalInput}
            onSubmitEditing={handleEnhanceTask}
            blurOnSubmit={true}
          />
        </View>

        <Text style={styles.separator}>- OR -</Text>

        {/* Manual Task Form */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Task Title 📝"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={taskType}
              onValueChange={setTaskType}
              style={styles.picker}
            >
              {taskTypes.map(type => (
                <Picker.Item 
                  key={type} 
                  label={`${getTaskTypeEmoji(type)} ${type}`} 
                  value={type} 
                />
              ))}
            </Picker>
          </View>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Reminder Message 💭"
            value={reminderText}
            onChangeText={setReminderText}
            multiline
            numberOfLines={3}
          />
          
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={showDateTimePicker}
          >
            <Text>📅 Select Date/Time: {format(date, 'PPpp')}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode={mode}
              is24Hour={true}
              onChange={onDateChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}

          <TouchableOpacity 
            style={[styles.addButton, loading && styles.disabledButton]}
            onPress={handleAddTask}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '⏳ Adding...' : '✅ Add Task'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.taskList}>
          {tasks.map(task => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskContent}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskType}>
                    {getTaskTypeEmoji(task.task_type)} {task.task_type}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTask(task.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.reminderText}>{task.reminder_text}</Text>
                <Text style={styles.taskDate}>
                  ⏰ {format(new Date(task.notification_time), 'PPpp')}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskType: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  reminderText: {
    color: '#444',
    marginBottom: 5,
    fontSize: 16,
  },
  taskDate: {
    color: '#666',
    marginTop: 5,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  aiInputContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  separator: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
});
