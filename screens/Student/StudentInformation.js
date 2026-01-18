import React, { useState, useEffect, useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Moment from 'moment';
import api from '../../api';
import DropDownPicker from 'react-native-dropdown-picker';

const gradeOptions = [
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
];

export default function StudentProfileScreen({ navigation, route }) {
    const user = route.params.user;
    const student = user.student;

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        parent_name: student.parent_name ?? '',
        parent_phone: student.parent_phone ?? '',
        phone: student.phone ?? '',
        primary_school: student.primary_school ?? '',
        grade: student.grade ?? null,
    });
    const [refreshing, setRefreshing] = useState(false);

    // dropdown picker state
    const [gradeOpen, setGradeOpen] = useState(false);
    const [gradeItems, setGradeItems] = useState(gradeOptions);
    const [gradeValue, setGradeValue] = useState(formData.grade);


    // initials for avatar
    const initials = useMemo(() => {
        const parts = (user?.name || '').trim().split(' ').filter(Boolean);
        const first = parts[0]?.[0] || '';
        const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
        return (first + last).toUpperCase();
    }, [user?.name]);

    // keep grade in formData
    useEffect(() => {
        setFormData((fd) => ({ ...fd, grade: gradeValue }));
    }, [gradeValue]);

    const fetchStudentData = async () => {
        setRefreshing(true);
        try {
            const res = await api.get(`/student/${student.id}`);
            const s = res.data;

            setFormData({
                parent_name: s.parent_name ?? '',
                parent_phone: s.parent_phone ?? '',
                phone: s.phone ?? '',
                primary_school: s.primary_school ?? '',
                grade: s.grade ?? null,
            });
            setGradeValue(s.grade ?? null);
        } catch (error) {
            console.error(error);
            Alert.alert('Greška', 'Nije uspelo učitavanje podataka.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStudentData();
    }, []);

    const handleUpdate = async () => {
        try {
            await api.put(`/student/${student.id}`, formData);
            Alert.alert('Uspešno', 'Podaci su uspešno ažurirani.');
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Greška', 'Došlo je do greške prilikom ažuriranja podataka.');
        }
    };

    const handleCancel = () => {
        fetchStudentData();
        setIsEditing(false);
    };

    const renderRow = ({ icon, label, value, keyName, placeholder }) => (
        <View style={styles.row} key={keyName}>
            <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>{icon}</View>
                <Text style={styles.rowLabel}>{label}</Text>
            </View>

            {isEditing ? (
                <TextInput
                    style={styles.input}
                    value={value}
                    placeholder={placeholder || '—'}
                    placeholderTextColor="#94A3B8"
                    onChangeText={(text) => setFormData({ ...formData, [keyName]: text })}
                />
            ) : (
                <Text style={styles.rowValue} numberOfLines={2}>
                    {value?.toString()?.trim() ? value : '—'}
                </Text>
            )}
        </View>
    );

    const gradeLabel =
        gradeItems.find((i) => i.value === formData.grade)?.label || '—';

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchStudentData} />
                }
                keyboardShouldPersistTaps="handled"
            >
                {/* Header card */}
                <LinearGradient
                    colors={['#4E6A8A', '#2F4E70']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerCard}
                >
                    <View style={styles.headerTop}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials || 'S'}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerName} numberOfLines={2}>
                                {user.name}
                            </Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Profil učenika</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.headerMetaRow}>

                    </View>
                </LinearGradient>

                {/* Section: Kontakt */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Kontakt</Text>

                    {renderRow({
                        icon: <MaterialIcons name="person-outline" size={18} color="#0F172A" />,
                        label: 'Ime roditelja',
                        value: formData.parent_name,
                        keyName: 'parent_name',
                        placeholder: 'Unesi ime',
                    })}

                    {renderRow({
                        icon: <FontAwesome5 name="id-card" size={16} color="#0F172A" />,
                        label: 'Broj roditelja',
                        value: formData.parent_phone,
                        keyName: 'parent_phone',
                        placeholder: 'npr. 06x/xxx-xxxx',
                    })}

                    {renderRow({
                        icon: <MaterialIcons name="phone-android" size={18} color="#0F172A" />,
                        label: 'Telefon učenika',
                        value: formData.phone,
                        keyName: 'phone',
                        placeholder: 'npr. 06x/xxx-xxxx',
                    })}
                </View>

                {/* Section: Skola */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Škola</Text>

                    {renderRow({
                        icon: <MaterialIcons name="school" size={18} color="#0F172A" />,
                        label: 'Osnovna škola',
                        value: formData.primary_school,
                        keyName: 'primary_school',
                        placeholder: 'Naziv škole',
                    })}

                    {/* Grade Dropdown */}
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={styles.iconWrap}>
                                <FontAwesome5 name="chalkboard-teacher" size={16} color="#0F172A" />
                            </View>
                            <Text style={styles.rowLabel}>Razred</Text>
                        </View>

                        {isEditing ? (
                            <View style={{ flex: 1, zIndex: 999 }}>
                                <DropDownPicker
                                    listMode="MODAL"
                                    open={gradeOpen}
                                    value={gradeValue}
                                    items={gradeItems}
                                    setOpen={setGradeOpen}
                                    setValue={setGradeValue}
                                    setItems={setGradeItems}
                                    placeholder="Izaberi razred"
                                    modalTitle="Izaberi razred"
                                    modalProps={{
                                        animationType: 'fade',
                                        presentationStyle: 'overFullScreen',
                                    }}
                                    style={styles.dropdown}
                                    dropDownContainerStyle={styles.dropdownContainer}
                                />
                            </View>
                        ) : (
                            <Text style={styles.rowValue} numberOfLines={2}>
                                {gradeLabel}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                    {isEditing ? (
                        <>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdate}>
                                <Text style={styles.primaryBtnText}>Sačuvaj</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.outlineBtn} onPress={handleCancel}>
                                <Text style={styles.outlineBtnText}>Odustani</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsEditing(true)}>
                            <Text style={styles.primaryBtnText}>Izmeni podatke</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 18 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F6F8FB',
    },
    content: {
        padding: 16,
        paddingBottom: 28,
    },

    headerCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,

        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
    },
    headerName: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
    },
    badge: {
        alignSelf: 'flex-start',
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.16)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: {
        color: '#E2E8F0',
        fontSize: 12,
        fontWeight: '800',
    },
    headerMetaRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
        flexWrap: 'wrap',
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(15, 23, 42, 0.18)',
    },
    metaText: {
        color: '#E2E8F0',
        fontSize: 12,
        fontWeight: '800',
    },

    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E6EAF0',

        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 8,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEF2F7',
        gap: 12,
    },
    rowLeft: {
        width: 130,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    rowLabel: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '800',
    },
    rowValue: {
        flex: 1,
        textAlign: 'right',
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '900',
    },

    input: {
        flex: 1,
        textAlign: 'right',
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    dropdown: {
        borderRadius: 12,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        minHeight: 46,
    },
    dropdownContainer: {
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },

    buttonRow: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 10,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: '#FF8C00',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',

        shadowColor: '#FF8C00',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 2,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
    },

    outlineBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    outlineBtnText: {
        color: '#0F172A',
        fontSize: 15,
        fontWeight: '900',
    },
});
