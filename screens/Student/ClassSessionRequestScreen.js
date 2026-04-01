import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import tw from 'twrnc';
import api from '../../api';

// 🇷🇸 Podešavanje kalendara na srpski
LocaleConfig.locales['sr'] = {
    monthNames: [
        'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'],
    dayNames: ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'],
    dayNamesShort: ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'],
    today: 'Danas'
};
LocaleConfig.defaultLocale = 'sr';

export default function ClassSessionRequestScreen({ navigation, route }) {
    const student = route.params.profile;
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [date, setDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(null);
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({
        course: false,
        teacher: false,
        location: false,
        time: false
    });
    const scrollViewRef = useRef(null);

    // Dozvoljene lokacije i termini
    const availableLocations = [
        'Pedje Milosavljevića 48',
        'Danila Srdića 11',
        'TC Piramida'
    ];

    const availableTimes = [
        '08:30',
        '10:00',
        '11:30',
        '14:30',
        '16:00',
        '17:30'
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const res = await api.get(`/student/${student.id}/enrollments`);
            const enrollments = res.data.enrollments || [];

            const uniqCourses = [];
            const uniqTeachers = [];

            enrollments.forEach(e => {
                if (e.course) {
                    if (!uniqCourses.some(c => c.id === e.course.id)) {
                        uniqCourses.push({
                            ...e.course,
                            teachers: e.course.teachers || []
                        });
                    }
                    e.course.teachers.forEach(t => {
                        const existing = uniqTeachers.find(x => x.id === t.id);
                        if (existing) {
                            if (!existing.courses.some(c => c.id === e.course.id)) {
                                existing.courses.push({ id: e.course.id, name: e.course.name });
                            }
                        } else {
                            uniqTeachers.push({
                                ...t,
                                courses: [{ id: e.course.id, name: e.course.name }]
                            });
                        }
                    });
                }
            });

            setCourses(uniqCourses);
            setTeachers(uniqTeachers);

        } catch (err) {
            console.error(err);
            Alert.alert('Greška', 'Neuspešno učitavanje podataka');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSubmit = async () => {
        const newErrors = {
            course: !selectedCourse,
            teacher: !selectedTeacher,
            location: !location,
            time: !selectedTime
        };
        setErrors(newErrors);

        if (Object.values(newErrors).some(e => e)) {
            Alert.alert('Greška', 'Popunite sva obavezna polja');
            return;
        }

        // Blokiraj petak
        if (new Date(date).getDay() === 5) {
            Alert.alert('Zabranjeno', 'Časovi se ne mogu zakazivati petkom.');
            return;
        }

        setSubmitting(true);
        try {
            // Automatski kraj časa +45 min
            const [hour, minute] = selectedTime.split(':').map(Number);
            const startDate = new Date(date);
            startDate.setHours(hour, minute, 0);
            const endDate = new Date(startDate.getTime() + 45 * 60000);


            await api.post('/class-requests', {
                student_id: student.id,
                course_id: selectedCourse,
                teacher_id: selectedTeacher,
                date: date.toISOString().split('T')[0],
                start_time: selectedTime,
                end_time: endDate.toTimeString().slice(0, 5),
                location : `${location} - ${student.full_name}`
            });

            Alert.alert('Uspeh', 'Zahtev je poslat.');
            setSelectedCourse(null);
            setSelectedTeacher(null);
            setSelectedTime(null);
            setLocation('');
            setDate(new Date());
        } catch (err) {
            console.error(err);
            Alert.alert('Greška', 'Neuspešno slanje zahteva.');
        } finally {
            setSubmitting(false);
            fetchData();
        }
    };

    if (loading) {
        return (
            <View style={tw`flex-1 justify-center items-center`}>
                <Text>Učitavanje...</Text>
            </View>
        );
    }

    const formatDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}.${year}`;
    };

    const marked = {};
    marked[date.toISOString().split('T')[0]] = { selected: true, selectedColor: '#4e54c8' };

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-100`}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={80}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.container}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.label}>Kurs</Text>
                    <View style={styles.dropdown}>
                        {(selectedTeacher
                                ? teachers.find(t => t.id === selectedTeacher)?.courses || []
                                : courses
                        ).map(c => (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.option, selectedCourse === c.id && styles.selected]}
                                onPress={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
                            >
                                <Text style={[styles.optionText, selectedCourse === c.id && styles.optionSelectedText]}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Profesor</Text>
                    <View style={styles.dropdown}>
                        {(selectedCourse
                                ? courses.find(c => c.id === selectedCourse)?.teachers || []
                                : teachers
                        ).map(t => (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.option, selectedTeacher === t.id && styles.selected]}
                                onPress={() => setSelectedTeacher(t.id === selectedTeacher ? null : t.id)}
                            >
                                <Text style={[styles.optionText, selectedTeacher === t.id && styles.optionSelectedText]}>
                                    {t.full_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Datum</Text>
                    <Calendar
                        onDayPress={day => setDate(new Date(day.dateString))}
                        markedDates={marked}
                        theme={{ todayTextColor: '#4e54c8', selectedDayBackgroundColor: '#4e54c8' }}
                        renderHeader={(date) => {
                            const d = new Date(date);
                            return (
                                <Text style={{ fontSize: 18, fontWeight: 'semibold' }}>
                                    {formatDate(d)}
                                </Text>
                            );
                        }}
                    />

                    <Text style={styles.label}>Vreme početka časa</Text>
                    <Picker
                        selectedValue={selectedTime}
                        style={[styles.picker, errors.time && { borderColor: 'red', borderWidth: 1 }]}
                        onValueChange={(value) => {
                            setSelectedTime(value);
                            setErrors(prev => ({ ...prev, time: false }));
                        }}
                    >
                        <Picker.Item label="Izaberi vreme" value={null} />
                        {availableTimes.map((time) => (
                            <Picker.Item key={time} label={time} value={time} />
                        ))}
                    </Picker>

                    <Text style={styles.label}>Lokacija</Text>
                    <Picker
                        selectedValue={location}
                        style={[styles.picker, errors.location && { borderColor: 'red', borderWidth: 1 }]}
                        onValueChange={(value) => {
                            setLocation(value);
                            setErrors(prev => ({ ...prev, location: false }));
                        }}
                    >
                        <Picker.Item label="Izaberi lokaciju" value="" />
                        {availableLocations.map((loc) => (
                            <Picker.Item key={loc} label={loc} value={loc} />
                        ))}
                    </Picker>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <Text style={styles.buttonText}>
                            {submitting ? 'Šaljem...' : 'Pošalji zahtev'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
    dropdown: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 0 },
    option: { padding: 8, backgroundColor: '#fff', margin: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ddd' },
    selected: { backgroundColor: '#4e54c8', borderColor: '#4e54c8' },
    optionText: { fontSize: 14, color: '#333' },
    optionSelectedText: { color: '#fff' },
    picker: { backgroundColor: '#fff', marginTop: 8 },
    button: { backgroundColor: '#4e54c8', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
