import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';


import Home from './src/screens/Home'; 
import DislexiaScreen from './src/screens/DislexiaScreen';
import DiscalculiaScreen from './src/screens/DiscalculiaScreen';
import ParabensScreen from './src/screens/ParabensScreen';
import ProfessorScreen from './src/screens/ProfessorScreen';
import SplashScreen from './src/screens/SplashScreen';
import ModoVRScreen from './src/screens/ModoVRScreen';


const Stack = createStackNavigator();



export default function App() {
  return (
    <NavigationContainer>
     <Stack.Navigator initialRouteName="Splash">
        
        {/* Nova tela de carregamento */}
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Home" 
          component={Home} 
          options={{ headerShown: false }} 
        />

        {/* Outras Telas */}
        <Stack.Screen 
          name="Dislexia" 
          component={DislexiaScreen} 
          options={{ title: 'Treino de Dislexia' }} 
        />
        
        <Stack.Screen 
          name="Discalculia" 
          component={DiscalculiaScreen} 
          options={{ title: 'Treino de Números' }} 
        />

        <Stack.Screen 
          name="Parabens" 
          component={ParabensScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Professor" 
          component={ProfessorScreen} 
          options={{ title: 'Área do Professor' }} 
        />

        <Stack.Screen name="ModoVR" component={ModoVRScreen}options={{ headerShown: false }} 
/>

      

      </Stack.Navigator>
    </NavigationContainer>
  );
}