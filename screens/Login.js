// front/screens/Login.js

import React, { useState, useRef, useContext } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    Image,
    TextInput,
    Alert,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const COLORS = {
    white: '#FFFFFF',
    orange: '#FF8C00',
    navy: '#112E50',
    lightGray: '#F5F5F5',
};

export default function LoginScreen() {
    const navigation = useNavigation();
    const { setUser, setProfile } = useContext(AuthContext);

    const [nameOrEmail, setNameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [seePassword, setSeePassword] = useState(true);
    const [loading, setLoading] = useState(false);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    const dismissKeyboard = () => Keyboard.dismiss();
    const togglePassword = () => setSeePassword(prev => !prev);

    const handleLogin = async () => {
        if (!nameOrEmail.trim() || !password.trim()) {
            Alert.alert('', 'Email i lozinka su obavezni.');
            return;
        }

        setLoading(true);
        try {
            const resp = await api.post('/login', { nameOrEmail, password });

            await AsyncStorage.setItem('token', resp.data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${resp.data.token}`;
            const { user, firstLogin } = resp.data;
            // const firstLogin = resp.data.user?.student?.parent_name === null;

            let profileData = null;
            if (user.role === 'student') {
                const studentResp = await api.get(`/student/${user.student.id}`);
                profileData = studentResp.data;
            } else if (user.role === 'teacher') {
                const teacherResp = await api.get(`/teacher/${user.teacher.id}`);
                profileData = teacherResp.data;
            }

            await AsyncStorage.setItem('user', JSON.stringify(user));
            await AsyncStorage.setItem('profile', JSON.stringify(profileData));

            setUser(user);
            setProfile(profileData);

            if (firstLogin) {
                navigation.replace('FirstLogin', { user });
            } else {
                navigation.replace('Dashboard');
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Došlo je do greške u prijavi';
            Alert.alert('Greška', msg);
        } finally {
            setLoading(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <View/>
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <LinearGradient
                    colors={[COLORS.navy, COLORS.orange]}
                    style={styles.gradient}
                >
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Triangl</Text>
                    </View>

                    <View style={styles.card}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => emailRef.current?.focus()}
                            style={styles.fieldWrapper}
                        >
                            <MaterialIcons name="person" size={24} color={COLORS.navy} />
                            <TextInput
                                ref={emailRef}
                                value={nameOrEmail}
                                onChangeText={setNameOrEmail}
                                testID="username"
                                placeholder="Email ili korisničko ime"
                                placeholderTextColor="#888"
                                autoCapitalize="none"
                                style={styles.input}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />
                        </TouchableOpacity>
                        <View style={styles.fieldSeparator} />

                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => passwordRef.current?.focus()}
                            style={styles.fieldWrapper}
                        >
                            <MaterialIcons name="lock" size={24} color={COLORS.navy} />
                            <TextInput
                                ref={passwordRef}
                                value={password}
                                testID='password'
                                onChangeText={setPassword}
                                placeholder="Lozinka"
                                placeholderTextColor="#888"
                                secureTextEntry={seePassword}
                                autoCapitalize="none"
                                style={styles.input}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={togglePassword} style={{ padding: 8 }}>
                                <Entypo
                                    name={seePassword ? 'eye-with-line' : 'eye'}
                                    size={24}
                                    color={COLORS.navy}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <View style={styles.fieldSeparator} />

                        {loading ? (
                            <ActivityIndicator size="large" color={COLORS.navy} style={styles.loading} />
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: COLORS.navy }]}
                                onPress={handleLogin}
                            >
                                <Text style={styles.buttonText}>Prijava</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 96,
        height: 96,
    },
    title: {
        marginTop: 12,
        fontSize: 34,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 28,
        padding: 28,
        shadowColor: COLORS.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 18,
        color: COLORS.navy,
    },
    fieldSeparator: {
        height: 1,
        backgroundColor: COLORS.navy,
        opacity: 0.2,
        marginVertical: 4,
    },
    loading: {
        marginTop: 16,
    },
    button: {
        marginTop: 24,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: COLORS.white,
        fontSize: 16,
    },
    registerLinkContainer: {
        marginLeft: 6,
    },
    footerLink: {
        color: COLORS.orange,
        fontWeight: '600',
        fontSize: 16,
    },
});
