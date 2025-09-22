import React, { useContext, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import api from './api';

import LoginScreen from './screens/Login';
import Register from './screens/Register';
import FirstLogin from './screens/FirstLogin';
import { AuthProvider, AuthContext } from './context/AuthContext';

import StudentQRCode from './screens/Student/StudentQRCode';
import TeacherQRCode from "./screens/Teacher/TeacherQRCode";
import RoleBasedNavigator from "./navigations/RoleBasedNavigator";
import SessionStudentsScreen from "./screens/Teacher/SessionStudentScreen";

const RootStack = createNativeStackNavigator();

// 📌 Kako se notifikacije prikazuju dok je app otvoren
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

function AppNavigator() {
    const { user, isLoading } = useContext(AuthContext);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        const registerForPushNotifications = async () => {
            let token;
            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    alert('Permission for push notifications not granted!');
                    return;
                }

                token = (await Notifications.getExpoPushTokenAsync()).data;
                console.log("Expo push token:", token);

                if (user && token) {
                    try {
                        await api.post('/device-token', {
                            expo_push_token: token,
                            platform: Platform.OS,
                            app_version: '1.0.0',
                        });
                    } catch (error) {
                        if (error.response) {
                            console.log("📡 Status:", error.response.status);
                            console.log("📡 Headers:", error.response.headers);
                            console.log("📡 Data:", error.response.data);
                        } else if (error.request) {
                            console.log("📡 Request:", error.request);
                        } else {
                            console.log("📡 Error message:", error.message);
                        }
                        console.error("❌ Axios error config:", error.config);
                    }
                }
            } else {
                alert('Must use physical device for Push Notifications');
            }
            return token;
        };

        registerForPushNotifications();

        // 📌 Dodaj kanal za Android
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        // Listener kad stigne notifikacija dok je app otvoren
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('📩 Nova notifikacija:', notification);
        });

        // Listener kad user klikne na notifikaciju
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Korisnik kliknuo na notifikaciju:', response);
        });

        return () => {
            notificationListener.current && notificationListener.current.remove();
            responseListener.current && responseListener.current.remove();
        };
    }, [user]);


    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#112E50" />
            </View>
        );
    }

    return (
        <RootStack.Navigator
            initialRouteName={user ? 'Dashboard' : 'Login'}
            screenOptions={{ headerShown: false }}
        >
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={Register} />
            <RootStack.Screen name="FirstLogin" component={FirstLogin} />
            <RootStack.Screen name="Dashboard" component={RoleBasedNavigator} />
            <RootStack.Screen name="SessionStudents" component={SessionStudentsScreen} options={{ title: 'Učenici' }} />
            <RootStack.Screen name="StudentQRCode" component={StudentQRCode} options={{ title: 'QR Code' }} />
            <RootStack.Screen name="TeacherQRCode" component={TeacherQRCode} options={{ title: 'QR Code' }} />
        </RootStack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <SafeAreaProvider>
                    <AppNavigator />
                </SafeAreaProvider>
            </NavigationContainer>
        </AuthProvider>
    );
}
