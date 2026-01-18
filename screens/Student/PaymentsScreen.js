import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';

const FILTER_LABELS = {
    '': 'Svi kursevi',
    regular: 'Redovna nastava',
    preparatory: 'Pripremna nastava',
    other: 'Ostalo',
};

const PAYMENT_TYPE = {
    cash: 'gotovina',
    card: 'kartica',
};

const FilterButton = ({ label, status, active, onPress }) => {
    const isActive = active === status;
    return (
        <Pressable
            onPress={() => onPress(status)}
            style={[styles.pill, isActive && styles.pillActive]}
        >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {label}
            </Text>
        </Pressable>
    );
};

export default function PaymentsScreen({ route }) {
    const student = route.params.profile;
    const studentId = student.id;

    const [attendances, setAttendances] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchEnrollments = async () => {
        try {
            const res = await api.get(`/student/${studentId}/payments`);
            const data = res.data.enrollments || [];
            setEnrollments(data);
            applyFilter(filterStatus, data);
        } catch (err) {
            console.error('Greška pri učitavanju podataka:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchAttendances = async () => {
        try {
            const res = await api.get(`/student/${student.id}/attendances`);
            const rawAttendances = res.data?.attendances || [];

            const ONE_HOUR_MS = 60 * 60 * 1000;
            const nowPlusOneHour = new Date(Date.now() + ONE_HOUR_MS);

            const attendance_count = rawAttendances.filter((a) => {
                if (a.confirmation_status === 'cancelled') return false;

                const session = a.class_session;
                if (!session?.date || !session?.end_time) return false;

                const sessionEnd = new Date(`${session.date}T${session.end_time}`);
                return sessionEnd < nowPlusOneHour;
            });

            setAttendances(attendance_count);
        } catch (error) {
            console.error('Greška pri učitavanju prisustava:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEnrollments();
        fetchAttendances();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEnrollments();
        fetchAttendances();
    };

    const applyFilter = (status, data = enrollments) => {
        setFilterStatus(status);
        if (status === '') setFiltered(data);
        else setFiltered(data.filter((e) => e.course?.type === status));
    };

    // ✅ Attendance count po course_id
    const attendedCountByCourseId = useMemo(() => {
        const map = new Map();

        for (const a of attendances) {
            if (a.confirmation_status === 'cancelled') continue;

            const courseId = a.class_session?.course_id ?? a.class_session?.course?.id;
            if (!courseId) continue;

            // Naplata ide i za absent (ako nije otkazao)
            map.set(courseId, (map.get(courseId) || 0) + 1);
        }

        return map;
    }, [attendances]);

    const getCourseIdFromEnrollment = (e) => e.course_id ?? e.course?.id;

    const getPaidAmount = (e) =>
        e.payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

    const getTotalCostForEnrollment = (e) => {
        const basePrice = parseFloat(e.price || 0); // kod per_session: cena po casu
        if (e.payment_type === 'per_session') {
            const courseId = getCourseIdFromEnrollment(e);
            const attendedCount = attendedCountByCourseId.get(courseId) || 0;
            return basePrice * attendedCount;
        }
        return basePrice;
    };

    const getAttendedCountForEnrollment = (e) => {
        const courseId = getCourseIdFromEnrollment(e);
        return attendedCountByCourseId.get(courseId) || 0;
    };

    // ✅ Summary izračuni
    const totalCost = filtered.reduce((sum, e) => sum + getTotalCostForEnrollment(e), 0);
    const totalPaid = filtered.reduce((sum, e) => sum + getPaidAmount(e), 0);
    const totalDebt = totalCost - totalPaid;

    const money = (n) => Number(n || 0).toFixed(2);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header / Summary */}
                <LinearGradient
                    colors={['#4E6A8A', '#2F4E70']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.summaryCard}
                >
                    <View style={styles.summaryHeader}>
                        <View style={styles.summaryIcon}>
                            <Ionicons name="pricetag-outline" size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.summaryTitle}>Stanje</Text>
                            <Text style={styles.summarySubtitle}>Pregled uplata i dugovanja</Text>
                        </View>
                    </View>

                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Ukupan iznos za uplatu</Text>
                            <Text style={styles.summaryValue}>{money(totalCost)} RSD</Text>
                        </View>

                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Uplaćeno do sada</Text>
                            <Text style={styles.summaryValue}>{money(totalPaid)} RSD</Text>
                        </View>

                        <View style={[styles.summaryItem, styles.summaryItemWide]}>
                            <Text style={styles.summaryLabel}>Preostalo dugovanje</Text>
                            <Text style={[styles.summaryValue, styles.debtValue]}>
                                {money(totalDebt)} RSD
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Filters */}
                <View style={styles.filterBox}>
                    <Text style={styles.filterTitle}>Filter</Text>
                    <View style={styles.pillsRow}>
                        {Object.entries(FILTER_LABELS).map(([status, label]) => (
                            <FilterButton
                                key={status}
                                label={label}
                                status={status}
                                active={filterStatus}
                                onPress={applyFilter}
                            />
                        ))}
                    </View>
                </View>

                {/* Cards */}
                {filtered.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>Nema podataka</Text>
                        <Text style={styles.emptySubtitle}>Pokušaj drugi filter ili osveži listu.</Text>
                    </View>
                ) : (
                    filtered.map((item) => {
                        const paid = getPaidAmount(item);
                        const total = getTotalCostForEnrollment(item);
                        const debt = total - paid;

                        const isPerSession = item.payment_type === 'per_session';
                        const attendedCount = isPerSession ? getAttendedCountForEnrollment(item) : 0;
                        const pricePerSession = isPerSession ? parseFloat(item.price || 0) : 0;

                        return (
                            <View key={item.id} style={styles.card}>
                                {/* Header row */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardHeaderLeft}>
                                        <View style={styles.bookIcon}>
                                            <Ionicons name="book-outline" size={18} color="#0F172A" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.courseName} numberOfLines={2}>
                                                {item.course?.name || 'Kurs'}
                                            </Text>

                                            {/* Chips */}
                                            <View style={styles.chipsRow}>
                                                {item.course?.type ? (
                                                    <View style={styles.chipSoft}>
                                                        <Text style={styles.chipSoftText}>{FILTER_LABELS[item.course.type] || item.course.type}</Text>
                                                    </View>
                                                ) : null}

                                                {isPerSession ? (
                                                    <View style={styles.chipWarn}>
                                                        <Text style={styles.chipWarnText}>Placanje po casu</Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.chipSoft}>
                                                        <Text style={styles.chipSoftText}>Fiksna cena</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.totalBig}>{money(total)} RSD</Text>
                                        <Text style={styles.totalSmall}>Ukupno</Text>
                                    </View>
                                </View>

                                {/* Details */}
                                <View style={styles.infoRow}>
                                    <View style={styles.infoBox}>
                                        <Text style={styles.infoLabel}>{isPerSession ? 'Cena po času' : 'Cena'}</Text>
                                        <Text style={styles.infoValue}>
                                            {isPerSession ? `${money(pricePerSession)} RSD` : `${money(item.price)} RSD`}
                                        </Text>
                                    </View>

                                    <View style={styles.infoBox}>
                                        <Text style={styles.infoLabel}>Uplaćeno</Text>
                                        <Text style={styles.infoValue}>{money(paid)} RSD</Text>
                                    </View>

                                    <View style={styles.infoBox}>
                                        <Text style={styles.infoLabel}>Dug</Text>
                                        <Text style={[styles.infoValue, styles.debtText]}>{money(debt)} RSD</Text>
                                    </View>
                                </View>

                                {isPerSession ? (
                                    <View style={styles.sessionNote}>
                                        <Ionicons name="time-outline" size={16} color="#64748B" />
                                        <Text style={styles.sessionNoteText}>
                                            Naplaćeno po časovima: <Text style={styles.sessionNoteStrong}>{attendedCount}</Text>
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Payments list */}
                                <View style={styles.paymentsBox}>
                                    <Text style={styles.paymentsTitle}>Uplate</Text>

                                    {item.payments && item.payments.length > 0 ? (
                                        item.payments.map((p) => (
                                            <View key={p.id} style={styles.paymentRow}>
                                                <Text style={styles.paymentDate}>{p.payment_date?.split(' ')[0]}</Text>
                                                <View style={styles.paymentTypePill}>
                                                    <Text style={styles.paymentTypeText}>{PAYMENT_TYPE[p.type] || p.type}</Text>
                                                </View>
                                                <View style={styles.paymentAmountPill}>
                                                    <Text style={styles.paymentAmountText}>+{money(p.amount)} RSD</Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.noPaymentText}>Nema uplate za ovaj kurs</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6F8FB' },
    scrollContent: { padding: 16, paddingBottom: 28 },

    // Summary
    summaryCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    summaryIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    summarySubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '700' },

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summaryItem: {
        flexGrow: 1,
        minWidth: '47%',
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    summaryItemWide: { minWidth: '100%' },
    summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800' },
    summaryValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 6 },
    debtValue: { color: '#FFD1D6' },

    // Filters
    filterBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E6EAF0',
        marginBottom: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    filterTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    pill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pillActive: {
        backgroundColor: '#FF8C00',
        borderColor: '#FF8C00',
    },
    pillText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
    pillTextActive: { color: '#fff' },

    // Empty
    emptyBox: {
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E6EAF0',
    },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
    emptySubtitle: { marginTop: 6, fontSize: 13, color: '#64748B', lineHeight: 18 },

    // Card
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E6EAF0',
        marginBottom: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardHeaderLeft: { flexDirection: 'row', gap: 10, flex: 1, paddingRight: 10 },

    bookIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    courseName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chipSoft: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chipSoftText: { fontSize: 12, fontWeight: '800', color: '#334155' },
    chipWarn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#FFF3E6',
        borderWidth: 1,
        borderColor: '#FFD9B3',
    },
    chipWarnText: { fontSize: 12, fontWeight: '900', color: '#B45309' },

    totalBig: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
    totalSmall: { fontSize: 12, fontWeight: '800', color: '#64748B', marginTop: 4, textAlign: 'right' },

    infoRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
    infoBox: {
        flexGrow: 1,
        minWidth: '30%',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#EEF2F7',
    },
    infoLabel: { fontSize: 12, fontWeight: '800', color: '#64748B' },
    infoValue: { marginTop: 6, fontSize: 13, fontWeight: '900', color: '#0F172A' },
    debtText: { color: '#E11D48' },

    sessionNote: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#EEF2F7',
    },
    sessionNoteText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
    sessionNoteStrong: { color: '#0F172A', fontWeight: '900' },

    paymentsBox: {
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#EEF2F7',
        paddingTop: 12,
    },
    paymentsTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A', marginBottom: 10 },

    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    paymentDate: { flex: 1, color: '#334155', fontSize: 13, fontWeight: '800' },

    paymentTypePill: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    paymentTypeText: { fontSize: 12, fontWeight: '800', color: '#334155' },

    paymentAmountPill: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#EAFBF2',
        borderWidth: 1,
        borderColor: '#BFEBD6',
    },
    paymentAmountText: { fontSize: 12, fontWeight: '900', color: '#0F766E' },

    noPaymentText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
});
