import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Pressable,
} from 'react-native';
import api from '../../api';
import Moment from 'moment';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function PrisustvaScreen({ route }) {
    const student = route.params.profile;
    const [attendances, setAttendances] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    const fetchAttendances = async () => {
        try {
            const res = await api.get(`/student/${student.id}/attendances`);
            const rawAttendances = res.data?.attendances || [];

            const ONE_HOUR_MS = 60 * 60 * 1000;
            const nowPlusOneHour = new Date(Date.now() + ONE_HOUR_MS);

            // ✅ samo prosli casovi, ali NE izbacujemo cancelled
            const pastOnly = rawAttendances.filter((a) => {
                const session = a.class_session;
                if (!session?.date || !session?.end_time) return false;

                const sessionEnd = new Date(`${session.date}T${session.end_time}`);
                return sessionEnd < nowPlusOneHour;
            });

            const sorted = [...pastOnly].sort((a, b) => {
                const aEnd = new Date(`${a.class_session.date}T${a.class_session.end_time}`);
                const bEnd = new Date(`${b.class_session.date}T${b.class_session.end_time}`);
                return bEnd - aEnd;
            });

            setAttendances(sorted);
            applyFilter(filterStatus, sorted);
        } catch (error) {
            console.error("Greška pri učitavanju prisustava:", error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAttendances();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAttendances();
    };

    const applyFilter = (status, data = attendances) => {
        setFilterStatus(status);

        if (status === '') {
            setFiltered(data);
            return;
        }

        if (status === 'cancelled') {
            setFiltered(data.filter((a) => a.confirmation_status === 'cancelled'));
            return;
        }

        // present/absent
        setFiltered(data.filter((a) => a.status === status));
    };

    const getStatusIcon = (item) => {
        if (item.confirmation_status === 'cancelled') {
            return <Ionicons name="ban" size={20} color="#ff8c00" />;
        }

        switch (item.status) {
            case 'present':
                return <Ionicons name="checkmark-circle" size={20} color="green" />;
            case 'absent':
                return <Ionicons name="close-circle" size={20} color="red" />;
            default:
                return <Ionicons name="help-circle" size={20} color="gray" />;
        }
    };

    const totalCancelled = attendances.filter(a => a.confirmation_status === 'cancelled').length;
    const totalPresent = attendances.filter(a => a.confirmation_status !== 'cancelled' && a.status === 'present').length;
    const totalAbsent = attendances.filter(a => a.confirmation_status !== 'cancelled' && a.status === 'absent').length;
    const totalClasses = attendances.length;

    const FilterButton = ({ label, status }) => (
        <Pressable
            onPress={() => applyFilter(status)}
            style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive,
            ]}
        >
            <Text
                style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Prikaz ukupnih brojeva */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Ukupno casova</Text>
                        <Text style={styles.statValue}>{totalClasses}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Prisustva</Text>
                        <Text style={[styles.statValue, { color: "green" }]}>{totalPresent}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Odsustva</Text>
                        <Text style={[styles.statValue, { color: "red" }]}>{totalAbsent}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Otkazano</Text>
                        <Text style={[styles.statValue, { color: "#ff8c00" }]}>{totalCancelled}</Text>
                    </View>
                </View>

                <View style={styles.filterWrapper}>
                    <View style={styles.filterRow}>
                        <FilterButton label="Sva" status="" />
                        <FilterButton label="Prisutan" status="present" />
                        <FilterButton label="Odsutan" status="absent" />
                        <FilterButton label="Otkazano" status="cancelled" />
                    </View>
                </View>

                {filtered.length === 0 ? (
                    <Text style={styles.noData}>Nema rezultata za izabrani filter.</Text>
                ) : (
                    filtered.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.header}>
                                <Text style={styles.course}>
                                    {item.class_session.course?.name || 'Nepoznat kurs'}
                                </Text>
                                {getStatusIcon(item)}
                            </View>

                            <Text style={styles.detail}>
                                📅 {Moment(item.class_session.date).format('DD.MM.YYYY.')}
                            </Text>
                            <Text style={styles.detail}>
                                🕒 {item.class_session.start_time} - {item.class_session.end_time}
                            </Text>
                            <Text style={styles.detail}>
                                📍 {item.class_session.location}
                            </Text>

                            {item.confirmation_status === 'cancelled' && (
                                <Text style={[styles.detail, { marginTop: 6, color: '#ff8c00', fontWeight: '700' }]}>
                                    Otkazano
                                </Text>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    countsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    countText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
    },
    filterWrapper: {
        marginBottom: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#112E50',
        backgroundColor: '#112E50',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#FF8C00',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#FF8C00',
        fontWeight: '600',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    card: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    course: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    detail: {
        fontSize: 14,
        color: '#555',
        marginTop: 2,
    },
    noData: {
        textAlign: 'center',
        marginTop: 32,
        color: '#888',
        fontSize: 16,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 16,
    },

    statCard: {
        width: "48%",
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e6e6e6",
    },

    statLabel: {
        fontSize: 13,
        color: "#555",
        fontWeight: "600",
        marginBottom: 6,
    },

    statValue: {
        fontSize: 22,
        fontWeight: "800",
        color: "#112E50",
    },
});
