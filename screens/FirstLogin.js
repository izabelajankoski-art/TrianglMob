import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api';

const COLORS = {
    white: '#FFFFFF',
    orange: '#FF8C00',
    navy: '#112E50',
    lightGray: '#F4F4F4',
    placeholder: '#B0B0B0',
};

export default function FirstLoginScreen() {
    const navigation = useNavigation();
    const { user } = useRoute().params;

    // zajedničko (šifra)
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // student polja
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [phone, setPhone] = useState('');
    const [primarySchool, setPrimarySchool] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [gradeValue, setGradeValue] = useState('');

    // teacher polja
    const [yearExp, setYearExp] = useState('');

    const [gradeOpen, setGradeOpen] = useState(false);
    const [gradeItems, setGradeItems] = useState([
        { label: 'Prvi razred – osnovna škola', value: 'prvi_os' },
        { label: 'Drugi razred – osnovna škola', value: 'drugi_os' },
        { label: 'Treći razred – osnovna škola', value: 'treci_os' },
        { label: 'Četvrti razred – osnovna škola', value: 'cetvrti_os' },
        { label: 'Peti razred – osnovna škola', value: 'peti_os' },
        { label: 'Šesti razred – osnovna škola', value: 'sesti_os' },
        { label: 'Sedmi razred – osnovna škola', value: 'sedmi_os' },
        { label: 'Osmi razred – osnovna škola', value: 'osmi_os' },
        { label: 'Prvi razred – srednja škola', value: 'prvi_ss' },
        { label: 'Drugi razred – srednja škola', value: 'drugi_ss' },
        { label: 'Treći razred – srednja škola', value: 'treci_ss' },
        { label: 'Četvrti razred – srednja škola', value: 'cetvrti_ss' },
        { label: 'Fakultet', value: 'fax' },
    ]);

    const [loading, setLoading] = useState(false);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSave = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Upozorenje', 'Unesite i šifru i potvrdu šifre.');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Upozorenje', 'Šifra mora imati najmanje 8 karaktera.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Greška', 'Šifre se ne poklapaju.');
            return;
        }

        setLoading(true);
        try {
            // 1️⃣ Promena šifre (zajednička ruta)
            await api.put(`/user/${user.id}`, {
                username: user.username,
                role: user.role,
                password: password,
                new_user: false
            });

            // 2️⃣ Update dodatnih podataka zavisno od role
            if (user.role === 'student') {
                if (!parentName || !phone || !primarySchool) {
                    Alert.alert('Upozorenje', 'Popunite sva obavezna polja.');
                    setLoading(false);
                    return;
                }

                await api.put(`/student/${user.student.id}`, {
                    user_id: user.id,
                    parent_name: parentName,
                    parent_phone: parentPhone,
                    phone,
                    primary_school: primarySchool,
                    grade: gradeValue,
                    birth_date: formatDate(birthDate),
                });
            } else if (user.role === 'teacher') {
                if (!phone || !birthDate || !yearExp) {
                    Alert.alert('Upozorenje', 'Popunite sva obavezna polja.');
                    setLoading(false);
                    return;
                }

                await api.put(`/teacher/${user.teacher.id}`, {
                    // user_id: user.id,
                    phone,
                    year_exp: parseInt(yearExp),
                    birth_date: formatDate(birthDate),
                });
            }

            Alert.alert('Uspešno', 'Podaci su sačuvani.');
            navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
            });
        } catch (err) {
            console.error(err);
            Alert.alert('Greška', err.response?.data?.message || err.message || 'Došlo je do greške.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <MaterialIcons name="emoji-people" size={48} color={COLORS.navy} />
                <Text style={styles.headerTitle}>Dobrodošli</Text>
                <Text style={styles.headerSubtitle}>{user.name}</Text>
            </View>
            <View style={styles.accentLine} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.form}>
                    {/* PROMENA ŠIFRE */}
                    <Text style={styles.label}>Nova šifra *</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Unesite novu šifru"
                            placeholderTextColor={COLORS.placeholder}
                            secureTextEntry={!showPassword}
                            style={styles.input}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color={COLORS.navy}
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Potvrdi šifru *</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Potvrdite šifru"
                            placeholderTextColor={COLORS.placeholder}
                            secureTextEntry={!showConfirmPassword}
                            style={styles.input}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            <Ionicons
                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color={COLORS.navy}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* STUDENT FORMA */}
                    {user.role === 'student' && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Ime roditelja *</Text>
                                <TextInput
                                    value={parentName}
                                    onChangeText={setParentName}
                                    placeholder="Unesite ime roditelja"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Telefon roditelja</Text>
                                <TextInput
                                    value={parentPhone}
                                    onChangeText={setParentPhone}
                                    placeholder="Telefon roditelja"
                                    keyboardType="phone-pad"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Telefon *</Text>
                                <TextInput
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Unesite broj telefona"
                                    keyboardType="phone-pad"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Škola *</Text>
                                <TextInput
                                    value={primarySchool}
                                    onChangeText={setPrimarySchool}
                                    placeholder="Naziv škole"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Razred</Text>
                                <DropDownPicker
                                    listMode="MODAL"
                                    open={gradeOpen}
                                    value={gradeValue}
                                    items={gradeItems}
                                    setOpen={setGradeOpen}
                                    setValue={setGradeValue}
                                    setItems={setGradeItems}
                                    placeholder="Izaberite razred"
                                    style={{ borderRadius: 8 }}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Datum rođenja *</Text>
                                <DateTimePicker
                                    display="spinner"
                                    value={birthDate}
                                    mode="date"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) setBirthDate(selectedDate);
                                    }}
                                />
                            </View>
                        </>
                    )}

                    {/* TEACHER FORMA */}
                    {user.role === 'teacher' && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Telefon *</Text>
                                <TextInput
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Unesite broj telefona"
                                    keyboardType="phone-pad"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Godine iskustva *</Text>
                                <TextInput
                                    value={yearExp}
                                    onChangeText={setYearExp}
                                    placeholder="Unesite broj godina iskustva"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Datum rođenja *</Text>
                                <DateTimePicker
                                    display="spinner"
                                    value={birthDate}
                                    mode="date"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) setBirthDate(selectedDate);
                                    }}
                                />
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Sačekajte...' : 'Sačuvaj'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: COLORS.white },
    headerContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        color: COLORS.navy,
        fontSize: 22,
        fontWeight: '700',
        marginTop: 8,
    },
    headerSubtitle: {
        color: COLORS.navy,
        fontSize: 16,
        marginTop: 4,
        opacity: 0.7,
    },
    accentLine: {
        height: 4,
        backgroundColor: COLORS.orange,
        marginHorizontal: 40,
        borderRadius: 2,
    },
    form: { padding: 24 },
    inputGroup: { marginBottom: 18 },
    label: {
        color: COLORS.navy,
        marginBottom: 6,
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        backgroundColor: COLORS.lightGray,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.navy,
    },
    passwordContainer: {
        position: 'relative',
        marginBottom: 18,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        top: '30%',
    },
    button: {
        backgroundColor: COLORS.orange,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '600',
    },
});
