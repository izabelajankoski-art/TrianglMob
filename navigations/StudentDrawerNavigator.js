import {View} from "react-native";
import StudentHome from "../screens/Student/StudentHome";
import Ionicons from "react-native-vector-icons/Ionicons";
import Schedule from "../screens/Student/ScheduleScreen";
import PaymentsScreen from "../screens/Student/PaymentsScreen";
import AttendanceScreen from "../screens/Student/AttendanceScreen";
import MaterialsScreen from "../screens/Student/Materials";
import StudentProfileScreen from "../screens/Student/StudentInformation";
import Packages from "../screens/Student/Packages";
import RateTeacherScreen from "../screens/Student/RateTeacherScreen";
import ClassSessionRequestScreen from "../screens/Student/ClassSessionRequestScreen";
import FloatingQRButton from "../components/FloatingQRButton";
import React, { useContext } from 'react';
import {createDrawerNavigator} from "@react-navigation/drawer";
import { AuthContext } from '../context/AuthContext';
import CustomDrawerContent from './CustomDrawerContent'
import TestsScreen from "../screens/Student/TestsScreen";

const Drawer = createDrawerNavigator();



export default function StudentDrawerNavigator({ route, navigation }) {
    const { user, profile } = useContext(AuthContext);
    return (
        <View style={{ flex: 1 }}>
            <Drawer.Navigator
                drawerContent={(props) => <CustomDrawerContent {...props} user={user} />}
                screenOptions={{
                    headerTintColor: '#fff',
                    headerStyle: { backgroundColor: '#112E50' },
                    drawerActiveTintColor: '#e87a25',
                    drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
                    drawerStyle: { backgroundColor: '#112E50' },
                    drawerLabelStyle: { fontWeight: '300' },
                }}
            >
                <Drawer.Screen
                    name="StudentHome"
                    component={StudentHome}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Početna',
                        drawerIcon: ({ size }) => <Ionicons name="home" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Schedule"
                    component={Schedule}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Raspored',
                        drawerIcon: ({ size }) => <Ionicons name="calendar" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Payments"
                    component={PaymentsScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Uplate',
                        drawerIcon: ({ size }) => <Ionicons name="cash" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Attendance"
                    component={AttendanceScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Prisustva',
                        drawerIcon: ({ size }) => <Ionicons name="checkmark-circle" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Materials"
                    component={MaterialsScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Materijali',
                        drawerIcon: ({ size }) => <Ionicons name="book" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Profile"
                    component={StudentProfileScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Profil',
                        drawerIcon: ({ size }) => <Ionicons name="person" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Packages"
                    component={Packages}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Paketi',
                        drawerIcon: ({ size }) => <Ionicons name="cart" size={size} color="#fff" />
                    }}
                />
                <Drawer.Screen
                    name="Oceni Profesora"
                    component={RateTeacherScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Oceni Profesora',
                        drawerIcon: ({ size }) => <Ionicons name="star" size={size} color="#fff" />
                    }}
                />

                <Drawer.Screen
                    name="Zahtevi"
                    component={ClassSessionRequestScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Zakaži cas',
                        drawerIcon: ({ size }) => <Ionicons name="send" size={size} color="#fff" />
                    }}
                />

                <Drawer.Screen
                    name="Testovi"
                    component={TestsScreen}
                    initialParams={{ user, profile }}
                    options={{
                        title: 'Testovi',
                        drawerIcon: ({ size }) => <Ionicons name="document-text" size={size} color="#fff" />
                    }}
                />
            </Drawer.Navigator>
            <FloatingQRButton onPress={() => navigation.navigate('StudentQRCode', { student: profile })} />
        </View>
    );
}
