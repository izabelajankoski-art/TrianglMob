import React, { useContext, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
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

// 📌 globalni navigation ref — omogućava navigaciju izvan React konteksta
export const navigationRef = createNavigationContainerRef();

const RootStack = createNativeStackNavigator();

// 📌 Kako se notifikacije prikazuju dok je app otvoren
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowList: true,
    }),
});

Notifications.addNotificationResponseReceivedListener(response => {
    console.log("🚀 TEST — globalni listener aktivan:", response.notification.request.content);
});

function AppNavigator() {
    const { user, isLoading } = useContext(AuthContext);
    const notificationListener = useRef();
    const responseListener = useRef();

    // 🔹 Obrada klika na notifikaciju (čas ili materijal)
    const handleNotificationResponse = (response) => {
        const data = response.notification.request.content.data;
        const classSessionId = data?.class_session_id;
        const materialId = data?.material_id;
        const courseId = data?.course_id;

        console.log("📩 Obrada notifikacije:", data);

        // ✅ Ako je notifikacija za ČAS
        if (classSessionId) {
            setTimeout(() => {
                if (navigationRef.current?.navigate) {
                    navigationRef.current.navigate('Dashboard', {
                        screen: 'Schedule',
                        params: {
                            openSessionId: classSessionId,  // ID časa koji treba označiti
                            highlightDate: data?.date || null, // možeš iz backenda dodati "date"
                        },
                    });
                    console.log("✅ Navigacija na čas uspešna.");
                } else {
                    console.log("❌ navigationRef nije spreman.");
                }
            }, 1000);
            return;
        }

        // ✅ Ako je notifikacija za MATERIJAL
        if (materialId) {
            setTimeout(() => {
                if (navigationRef.current?.navigate) {
                    navigationRef.current.navigate('Dashboard', {
                        screen: 'Materials',
                        params: { openMaterialId: materialId, courseId },
                    });
                    console.log("✅ Navigacija na materijal uspešna.");
                } else {
                    console.log("❌ navigationRef nije spreman.");
                }
            }, 1000);
            return;
        }

        console.log("⚠️ Notifikacija ne sadrži class_session_id ni material_id.");
    };

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
                    alert('Dozvola za push notifikacije nije odobrena!');
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
                        console.error("❌ Greška pri slanju tokena:", error.response?.data || error.message);
                    }
                }
            } else {
                alert('Push notifikacije rade samo na fizičkom uređaju.');
            }
            return token;
        };

        registerForPushNotifications();

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('📩 Nova notifikacija:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

        const checkInitialNotification = async () => {
            const lastResponse = await Notifications.getLastNotificationResponseAsync();
            if (lastResponse) {
                console.log("🚀 App pokrenut iz notifikacije!");
                handleNotificationResponse(lastResponse);
            }
        };
        checkInitialNotification();

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
            initialRouteName={
                !user
                    ? 'Login'
                    : user.new_user === 1
                        ? 'FirstLogin'
                        : 'Dashboard'
            }
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
            <NavigationContainer ref={navigationRef}>
                <SafeAreaProvider>
                    <AppNavigator />
                </SafeAreaProvider>
            </NavigationContainer>
        </AuthProvider>
    );
}
