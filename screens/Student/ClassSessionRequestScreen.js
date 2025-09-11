import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
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

// Configure Serbian locale for calendar
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
    const [startHour, setStartHour] = useState(new Date().getHours());
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState((new Date().getHours() + 1) % 24);
    const [endMinute, setEndMinute] = useState(0);
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({
        course: false,
        teacher: false,
        location: false,
    });
    const scrollViewRef = useRef(null);
    const courseRef = useRef(null);
    const teacherRef = useRef(null);
    const locationRef = useRef(null);



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
                    // dodaj kurs ako ne postoji
                    if (!uniqCourses.some(c => c.id === e.course.id)) {
                        uniqCourses.push({
                            ...e.course,
                            teachers: e.course.teachers || []
                        });
                    }
                    // dodaj svakog profesora sa kursevima
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
        // if (!selectedCourse || !selectedTeacher) {
        //     Alert.alert('Upozorenje', 'Izaberite kurs i profesora');
        //     return;
        // }
        // if (!location.trim()) {
        //     Alert.alert('Upozorenje', 'Lokacija je obavezna');
        //     return;
        // }

        const newErrors = {
            course: !selectedCourse,
            teacher: !selectedTeacher,
            location: !location.trim(),
        };
        setErrors(newErrors);

        // Ako postoji neka greška, prekini
        if (Object.values(newErrors).some(e => e)) {
            // Skroluj do prvog polja sa greškom
            if (newErrors.course) {
                courseRef.current?.measureLayout(
                    scrollViewRef.current,
                    (x, y) => scrollViewRef.current.scrollTo({ y, animated: true }),
                    () => {}
                );
            } else if (newErrors.teacher) {
                teacherRef.current?.measureLayout(
                    scrollViewRef.current,
                    (x, y) => scrollViewRef.current.scrollTo({ y, animated: true }),
                    () => {}
                );
            } else if (newErrors.location) {
                locationRef.current?.measureLayout(
                    scrollViewRef.current,
                    (x, y) => scrollViewRef.current.scrollTo({ y, animated: true }),
                    () => {}
                );
            }
            return;
        }


        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;
        if (end <= start) {
            Alert.alert('Greška', 'Kraj časa mora biti posle početka');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/class-requests', {
                student_id: student.id,
                course_id: selectedCourse,
                teacher_id: selectedTeacher,
                date: date.toISOString().split('T')[0],
                start_time: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
                end_time: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
                location,
            });
            Alert.alert('Uspeh', 'Zahtev je poslat');
        } catch (err) {
            console.error(err);
            Alert.alert('Greška', 'Neuspešno slanje zahteva');
        } finally {
            setSubmitting(false);
            setSelectedCourse(null);
            setSelectedTeacher(null);
            setDate(new Date());
            setStartHour(new Date().getHours());
            setStartMinute(0);
            setEndHour((new Date().getHours() + 1) % 24);
            setEndMinute(0)
            setLocation('');
            setErrors({ course: false, teacher: false, location: false });
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
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}.${year}`;
    };

    const marked = {};
    marked[date.toISOString().split('T')[0]] = { selected: true, selectedColor: '#4e54c8' };
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

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
                    {errors.course && <Text style={{ color: 'red', marginTop: '-10' }}>Kurs je obavezan</Text>}
                    <View ref={courseRef} style={styles.dropdown}>
                        {(selectedTeacher
                            ? teachers.find(t => t.id === selectedTeacher)?.courses || []
                            : courses
                        ).map(c => (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.option, selectedCourse === c.id && styles.selected, errors.course && { borderColor: 'red', borderWidth: 1 }]}
                                onPress={() => {
                                    if (selectedCourse === c.id) {
                                        setSelectedCourse(null); 
                                    } else {
                                        setSelectedCourse(c.id);
                                        setErrors(prev => ({ ...prev, course: false }))
                                    }
                                }}

                            >
                                <Text style={[styles.optionText, selectedCourse === c.id && styles.selected]}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Profesor</Text>
                    {errors.course && <Text style={{ color: 'red', marginTop: '-10' }}>Profesor je obavezan</Text>}
                    <View ref={teacherRef} style={styles.dropdown}>
                        {(selectedCourse
                            ? courses.find(c => c.id === selectedCourse)?.teachers || []
                            : teachers
                        ).map(t => (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.option, selectedTeacher === t.id && styles.selected, errors.teacher && { borderColor: 'red', borderWidth: 1 }]}
                                onPress={() => {
                                    if (selectedTeacher === t.id) {
                                        setSelectedTeacher(null);
                                    } else {
                                        setSelectedTeacher(t.id);
                                        setErrors(prev => ({ ...prev, teacher: false }))
                                    }
                                }}

                            >
                                <Text style={[styles.optionText, selectedTeacher === t.id && styles.selected]}>
                                    {t.full_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>


                    <Text style={styles.label}>Datum</Text>
                    {/* <Text style={styles.selectedDateText}>Izabrani datum: {formatDate(date)}</Text> */}
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

                    <Text style={styles.label}>Početak časa</Text>
                    <View style={styles.timeRow}>
                        <Picker
                            selectedValue={startHour}
                            style={styles.picker}
                            onValueChange={setStartHour}
                        >
                            {hours.map(h => (
                                <Picker.Item key={h} label={String(h).padStart(2, '0')} value={h} />
                            ))}
                        </Picker>
                        <Picker
                            selectedValue={startMinute}
                            style={styles.picker}
                            onValueChange={setStartMinute}
                        >
                            {minutes.map(m => (
                                <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
                            ))}
                        </Picker>
                    </View>

                    <Text style={styles.label}>Kraj časa</Text>
                    <View style={styles.timeRow}>
                        <Picker
                            selectedValue={endHour}
                            style={styles.picker}
                            onValueChange={setEndHour}
                        >
                            {hours.map(h => (
                                <Picker.Item key={h} label={String(h).padStart(2, '0')} value={h} />
                            ))}
                        </Picker>
                        <Picker
                            selectedValue={endMinute}
                            style={styles.picker}
                            onValueChange={setEndMinute}
                        >
                            {minutes.map(m => (
                                <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
                            ))}
                        </Picker>
                    </View>

                    <Text style={styles.label}>Lokacija</Text>
                    {errors.location && <Text style={{ color: 'red', marginTop: '-10' }}>Lokacija je obavezna</Text>}
                    <TextInput
                        style={[styles.input, errors.location && { borderColor: 'red', borderWidth: 1 }]}
                        placeholder="Unesite mesto..."
                        value={location}
                        ref={locationRef}
                        onChangeText={text => {
                            setLocation(text);
                            if (text.trim()) {
                                setErrors(prev => ({ ...prev, location: false }));
                            }
                        }}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <Text style={styles.buttonText}>{submitting ? 'Šaljem...' : 'Pošalji zahtev'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 12 },
    dropdown: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 0 },
    option: { padding: 8, backgroundColor: '#fff', margin: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ddd' },
    selected: { backgroundColor: '#4e54c8', borderColor: '#4e54c8', color: "#fff" },
    optionText: { fontSize: 14, color: '#333' },
    timeRow: { flexDirection: 'row', marginTop: 8 },
    picker: { flex: 1, backgroundColor: '#fff' },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#ddd' },
    button: { backgroundColor: '#4e54c8', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
