import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UploadScreen from './src/screens/UploadScreen';
import DecksScreen from './src/screens/DecksScreen';
import DeckDetailScreen from './src/screens/DeckDetailScreen';
import QuizModeScreen from './src/screens/QuizModeScreen';
import QuizScreen from './src/screens/QuizScreen';
import QuizResultScreen from './src/screens/QuizResultScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SentenceDecksScreen from './src/screens/SentenceDecksScreen';
import SentenceDeckDetailScreen from './src/screens/SentenceDeckDetailScreen';
import { RootStackParamList } from './src/types/navigation';

export type { RootStackParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();

const darkHeader = {
    headerStyle: { backgroundColor: '#1a1a1a' },
    headerTintColor: '#ffffff',
    headerTitleStyle: { fontWeight: 'bold' as const },
};

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Upload" screenOptions={darkHeader}>
                <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Read & Learn' }} />
                <Stack.Screen name="Decks" component={DecksScreen} options={{ title: 'Destelerim' }} />
                <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={({ route }) => ({ title: route.params.deckName })} />
                <Stack.Screen name="SentenceDecks" component={SentenceDecksScreen} options={{ title: 'Cümlelerim' }} />
                <Stack.Screen name="SentenceDeckDetail" component={SentenceDeckDetailScreen} options={({ route }) => ({ title: route.params.deckName })} />
                <Stack.Screen name="QuizMode" component={QuizModeScreen} options={{ title: 'Quiz Modu' }} />
                <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Quiz', headerBackVisible: false }} />
                <Stack.Screen name="QuizResult" component={QuizResultScreen} options={{ title: 'Sonuçlar', headerBackVisible: false }} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'İlerleme Paneli' }} />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ayarlar' }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
