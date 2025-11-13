import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

export default function LessonScreen({ route, navigation }) {
  const { task, user } = route.params;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Sample lesson content - in real app, this would come from task.lesson_data
  const lesson = {
    title: task.title,
    question: "¿Cuánto es 2 + 2?",
    options: [
      { id: 'a', text: '3', isCorrect: false },
      { id: 'b', text: '4', isCorrect: true },
      { id: 'c', text: '5', isCorrect: false },
      { id: 'd', text: '22', isCorrect: false },
    ],
    explanation: "2 + 2 = 4. Es una suma básica de dos números."
  };

  const handleSelectAnswer = (optionId) => {
    if (!showResult) {
      setSelectedAnswer(optionId);
    }
  };

  const handleSubmit = () => {
    if (!selectedAnswer) {
      Alert.alert('Select an answer', 'Please choose an option before continuing.');
      return;
    }

    const selectedOption = lesson.options.find(opt => opt.id === selectedAnswer);
    setIsCorrect(selectedOption.isCorrect);
    setShowResult(true);

    if (selectedOption.isCorrect) {
      // Wait a moment before navigating back with success
      setTimeout(() => {
        navigation.navigate('Home', { 
          lessonCompleted: true,
          taskId: task.id 
        });
      }, 2000);
    }
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
  };

  const getOptionStyle = (optionId) => {
    const baseStyle = [styles.option];
    
    if (showResult) {
      const option = lesson.options.find(opt => opt.id === optionId);
      if (option.isCorrect) {
        baseStyle.push(styles.optionCorrect);
      } else if (optionId === selectedAnswer) {
        baseStyle.push(styles.optionWrong);
      }
    } else if (selectedAnswer === optionId) {
      baseStyle.push(styles.optionSelected);
    }
    
    return baseStyle;
  };

  const getOptionTextStyle = (optionId) => {
    const baseStyle = [styles.optionText];
    
    if (showResult) {
      const option = lesson.options.find(opt => opt.id === optionId);
      if (option.isCorrect || optionId === selectedAnswer) {
        baseStyle.push(styles.optionTextSelected);
      }
    } else if (selectedAnswer === optionId) {
      baseStyle.push(styles.optionTextSelected);
    }
    
    return baseStyle;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lesson</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: showResult ? '100%' : '0%' }]} />
          </View>
        </View>

        {/* Lesson title */}
        <Text style={styles.lessonTitle}>{lesson.title}</Text>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.question}>{lesson.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {lesson.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={getOptionStyle(option.id)}
              onPress={() => handleSelectAnswer(option.id)}
              disabled={showResult}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionCircle}>
                  <Text style={styles.optionLetter}>{option.id.toUpperCase()}</Text>
                </View>
                <Text style={getOptionTextStyle(option.id)}>{option.text}</Text>
              </View>
              {showResult && option.isCorrect && (
                <Text style={styles.checkmark}>✓</Text>
              )}
              {showResult && option.id === selectedAnswer && !option.isCorrect && (
                <Text style={styles.xmark}>✕</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Result feedback */}
        {showResult && (
          <View style={[styles.resultContainer, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultTitle}>
              {isCorrect ? 'Correct! 🎉' : 'Incorrect! 😕'}
            </Text>
            <Text style={styles.resultExplanation}>{lesson.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomContainer}>
        {!showResult ? (
          <TouchableOpacity
            style={[styles.submitButton, !selectedAnswer && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedAnswer || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>CHECK</Text>
            )}
          </TouchableOpacity>
        ) : isCorrect ? (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>Continuing...</Text>
            <ActivityIndicator color="#58cc02" size="small" />
          </View>
        ) : (
          <View style={styles.retryContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>TRY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.skipButtonText}>QUIT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#777',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#58cc02',
    transition: 'width 0.3s',
  },
  lessonTitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  questionContainer: {
    marginBottom: 30,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#1cb0f6',
    backgroundColor: '#e3f2fd',
  },
  optionCorrect: {
    borderColor: '#58cc02',
    backgroundColor: '#d7ffb8',
  },
  optionWrong: {
    borderColor: '#ff4b4b',
    backgroundColor: '#ffdfe0',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#777',
  },
  optionText: {
    fontSize: 18,
    color: '#333',
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 24,
    color: '#58cc02',
    fontWeight: '700',
  },
  xmark: {
    fontSize: 24,
    color: '#ff4b4b',
    fontWeight: '700',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  resultCorrect: {
    backgroundColor: '#d7ffb8',
  },
  resultWrong: {
    backgroundColor: '#ffdfe0',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  resultExplanation: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  submitButton: {
    backgroundColor: '#58cc02',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#e5e5e5',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  successText: {
    fontSize: 16,
    color: '#58cc02',
    fontWeight: '600',
  },
  retryContainer: {
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#1cb0f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  skipButtonText: {
    color: '#777',
    fontSize: 16,
    fontWeight: '700',
  },
});
