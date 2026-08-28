import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    
    const timer = setTimeout(() => {
      navigation.replace('Home'); 
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      
      <Image 
        source={require('../../assets/images/axlt.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F4F8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logo: { 
    width: 280, 
    height: 280 
  }
});