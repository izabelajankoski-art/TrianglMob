
import {View} from "react-native";
import React, { useContext } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import CustomDrawerContent from './CustomDrawerContent'

import TeacherScheduleScreen from '../screens/Teacher/TeacherScheduleScreen';
import TeacherPayoutsScreen from '../screens/Teacher/TeacherPayoutsScreen';
import StudentHome from '../screens/Student/StudentHome'
import TeacherAttendanceScreen from "../screens/Teacher/TeacherAttendanceScreen";
import TeacherProfileScreen from "../screens/Teacher/TeacherProfileScreen";
import RateStudentScreen from "../screens/Teacher/RateStudentScreen";
import FloatingQRButton from "../components/FloatingQRButton";
import TeacherQRCode from "../screens/Teacher/TeacherQRCode";
import AdminHome from "../screens/Admin/AdminHome";

const Drawer = createDrawerNavigator();

export default function TeacherDrawerNavigator({navigation}) {
    const { user, profile} = useContext(AuthContext);

    return (
        <View style={{ flex: 1 }}>
        <Drawer.Navigator
            initialRouteName="TeacherInfo"
            drawerContent={props => <CustomDrawerContent {...props} user={user} />}
            screenOptions={{
                headerStyle: { backgroundColor: '#112E50' },
                headerTintColor: '#fff',
                drawerActiveTintColor: '#e87a25',
                drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
                drawerStyle: { backgroundColor: '#112E50' },
                drawerLabelStyle: { fontWeight: '300' },
            }}
        >
            <Drawer.Screen
                name="TeacherInfo"
                component={StudentHome}
                options={{
                    title: 'Information',
                    drawerIcon: ({ size }) => <Ionicons name="home" size={size} color="#fff" />
                }}
            />

            <Drawer.Screen
                name="TeacherSchedule"
                component={TeacherScheduleScreen}
                initialParams={{ user, profile }}
                options={{
                    title: 'Raspored',
                    drawerIcon: ({ size }) => <Ionicons name="calendar" size={size} color="#fff" />
                }}
            />

            <Drawer.Screen
                name="TeacherPayroll"
                component={TeacherPayoutsScreen}
                initialParams={{ user, profile }}
                options={{
                    title: 'Isplate',
                    drawerIcon: ({ size }) => <Ionicons name="cash" size={size} color="#fff" />
                }}
            />

            <Drawer.Screen
                name="TeacherAttendanceLog"
                component={TeacherAttendanceScreen}
                initialParams={{ user, profile }}
                options={{
                    title: 'Evidencija',
                    drawerIcon: ({ size }) => <Ionicons name="checkmark-circle" size={size} color="#fff" />
                }}
            />

            {/*<Drawer.Screen*/}
            {/*    name="TeacherMaterials"*/}
            {/*    component={TeacherScheduleScreen}*/}
            {/*    options={{*/}
            {/*        title: 'Materijali',*/}
            {/*        drawerIcon: ({ size }) => <Ionicons name="book" size={size} color="#fff" />*/}
            {/*    }}*/}
            {/*/>*/}

            <Drawer.Screen
                name="TeacherProfile"
                component={TeacherProfileScreen}
                initialParams={{ user, profile }}
                options={{
                    title: 'Profil',
                    drawerIcon: ({ size }) => <Ionicons name="person" size={size} color="#fff" />
                }}
            />

            <Drawer.Screen
                name="GradeStudent"
                component={RateStudentScreen}
                initialParams={{ user, profile }}
                options={{
                    title: 'Oceni učenika',
                    drawerIcon: ({ size }) => <Ionicons name="star" size={size} color="#fff" />
                }}
            />
            <Drawer.Screen
                name="AdminHome"
                component={AdminHome}
                initialParams={{ user, profile }}
                options={{
                    title: 'Skeniraj učenike',
                    drawerIcon: ({ size }) => <Ionicons name="qr-code-outline" size={size} color="#fff" />
                }}
            />
        </Drawer.Navigator>
            <FloatingQRButton onPress={() => navigation.navigate('TeacherQRCode', { teacher: profile })} />
        </View>
    );
}
