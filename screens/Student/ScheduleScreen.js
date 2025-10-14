import React, { useEffect, useState, useCallback } from "react";
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
} from "react-native";
import tw from "twrnc";
import { Calendar, LocaleConfig } from "react-native-calendars";
import Moment from "moment";
import api from "../../api";

// 📅 Lokalizacija kalendara
LocaleConfig.locales["sr"] = {
    monthNames: [
        "Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"
    ],
    monthNamesShort: ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"],
    dayNames: ["nedelja","ponedeljak","utorak","sreda","četvrtak","petak","subota"],
    dayNamesShort: ["ned","pon","uto","sre","čet","pet","sub"],
    today: "Danas",
};
LocaleConfig.defaultLocale = "sr";

const FILTER_LABELS = {
    '': 'Svi',
    regular: 'Redovna',
    preparatory: 'Pripremna',
    other: 'Ostalo',
};

export default function Schedule({ navigation, route }) {
    const { user, profile } = route.params;
    const studentId = profile?.id ?? user?.student?.id;

    const [attendances, setAttendances] = useState([]);
    const [scheduleMap, setScheduleMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(Moment().format("YYYY-MM-DD"));
    const [filterType, setFilterType] = useState("");
    const [highlightedSessionId, setHighlightedSessionId] = useState(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    // 🔹 Učitavanje rasporeda
    const loadAttendances = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        try {
            const res = await api.get(`/student/${studentId}/attendances`);
            setAttendances(res.data.attendances || []);
        } catch (err) {
            console.error(err);
            Alert.alert("Greška", err.response?.data?.message || "Neuspešno učitavanje termina.");
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAttendances();
        setRefreshing(false);
    }, [loadAttendances]);

    useEffect(() => {
        loadAttendances();
    }, [loadAttendances]);

    // 🔹 Normalizacija rasporeda u mapu po datumima
    useEffect(() => {
        const normalized = attendances
            .filter(a => a.class_session)
            .filter(a => filterType === '' || a.class_session.course.type === filterType)
            .map(a => ({
                attendance_id: a.id,
                class_session_id: a.class_session_id,
                confirmation_status: a.confirmation_status,
                date: a.class_session.date.split("T")[0],
                start_time: a.class_session.start_time,
                end_time: a.class_session.end_time,
                course: a.class_session.course,
            }));

        const map = {};
        normalized.forEach(s => {
            if (!map[s.date]) map[s.date] = [];
            map[s.date].push(s);
        });
        setScheduleMap(map);
    }, [attendances, filterType]);

    // 🔹 Kalendarsko označavanje sa velikim krugom za novi čas
    const markedDates = {};
    Object.entries(scheduleMap).forEach(([day, list]) => {
        const hasHighlighted = list.some(c => c.class_session_id === highlightedSessionId);

        if (hasHighlighted) {
            markedDates[day] = {
                customStyles: {
                    container: {
                        backgroundColor: "#FFA500",
                        borderRadius: 100,
                        width: 40,
                        height: 40,
                        justifyContent: "center",
                        alignItems: "center",
                    },
                    text: {
                        color: "white",
                        fontWeight: "bold",
                    },
                },
            };
        } else {
            markedDates[day] = {
                marked: true,
                dotColor: "#112E50",
            };
        }
    });

    if (selectedDate) {
        markedDates[selectedDate] = {
            ...(markedDates[selectedDate] || {}),
            selected: true,
            selectedColor: "#112E50",
        };
    }

    // 🔹 Potvrda ili otkazivanje časa
    const handleChangeStatus = async (sessionId, newStatus, sessionDate) => {
        if (!studentId) return;

        const today = Moment().format("YYYY-MM-DD");
        if (newStatus === "cancelled" && sessionDate === today) {
            Alert.alert("Zabrana", "Čas koji je zakazan za danas ne može se otkazati.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/attendance/change-confirmation-status", {
                class_session_id: sessionId,
                student_id: studentId,
                status: newStatus,
            });
            Alert.alert(newStatus === "confirmed" ? "Potvrđeno" : "Otkazano");
            setModalVisible(false);
            setTimeout(loadAttendances, 300);
        } catch (err) {
            console.error(err);
            Alert.alert("Greška", err.response?.data?.message || "Došlo je do greške.");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Otvaranje modala iz notifikacije
    const openClassFromNotification = async (classSessionId) => {
        setHighlightedSessionId(classSessionId);
        setModalVisible(true);
        setModalLoading(true);
        try {
            const res = await api.get(`/classSession/${classSessionId}`);
            setSelectedSession(res.data);
        } catch (err) {
            console.error("Greška pri dohvatanju časa:", err);
            Alert.alert("Greška", "Ne mogu da učitam detalje časa.");
        } finally {
            setModalLoading(false);
        }
    };

    useEffect(() => {
        if (route.params?.openSessionId) {
            console.log("🔔 Otvaram modal za čas ID:", route.params.openSessionId);
            setHighlightedSessionId(route.params.openSessionId);
            openClassFromNotification(route.params.openSessionId);
        }
    }, [route.params?.openSessionId]);

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-100`}>
            {/* Filteri */}
            <View style={tw`flex-row justify-around py-2 bg-white`}>
                {Object.entries(FILTER_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => setFilterType(key)}
                        style={tw`
                            px-5 py-5 rounded-1
                            ${filterType === key ? "bg-[#FFA500]" : "bg-gray-200"}
                        `}
                    >
                        <Text style={tw`${filterType === key ? "text-white" : "text-gray-700"}`}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Kalendar */}
            <View style={tw`mt-4 mx-4 bg-white rounded-xl shadow`}>
                <Calendar
                    onDayPress={(day) => setSelectedDate(day.dateString)}
                    markedDates={markedDates}
                    markingType={"custom"}
                    theme={{
                        todayTextColor: "#112E50",
                        selectedDayBackgroundColor: "#112E50",
                        arrowColor: "#112E50",
                        textDayFontSize: 16,
                    }}
                    monthFormat="MMMM"
                    firstDay={1}
                />
            </View>

            {/* Lista časova */}
            <ScrollView
                style={tw`mt-4 px-4`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#112E50" style={tw`mt-10`} />
                ) : (
                    <>
                        <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>
                            Časovi za {Moment(selectedDate).format("DD.MM.YYYY")}
                        </Text>

                        {(scheduleMap[selectedDate] || []).map((c) => {
                            const isConfirmed = c.confirmation_status === "confirmed";
                            const isHighlighted = c.class_session_id === highlightedSessionId;
                            return (
                                <View
                                    key={c.class_session_id}
                                    style={tw`
                                        mb-4 rounded-xl p-4 flex-row items-center shadow
                                        ${isHighlighted ? "bg-yellow-100 border-2 border-[#FFA500]" : "bg-white"}
                                    `}
                                >
                                    <View style={tw`w-1 h-full ${isHighlighted ? "bg-[#FFA500]" : "bg-[#112E50]"} rounded-l-xl mr-3`} />
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`font-bold text-gray-800`}>
                                            {c.course.name}
                                        </Text>
                                        <Text style={tw`text-gray-600`}>
                                            {c.start_time}–{c.end_time}
                                        </Text>
                                    </View>

                                    <View style={tw`flex-row gap-2`}>
                                        {isConfirmed ? (
                                            <>
                                                <TouchableOpacity
                                                    style={tw`px-3 py-1 bg-gray-600 rounded`}
                                                    onPress={() => handleChangeStatus(c.class_session_id, "cancelled", c.date)}
                                                >
                                                    <Text style={tw`text-white`}>Otkaži</Text>
                                                </TouchableOpacity>
                                                <View style={tw`px-3 py-1 bg-orange-500 rounded`}>
                                                    <Text style={tw`text-white`}>Potvrđeno</Text>
                                                </View>
                                            </>
                                        ) : (
                                            <TouchableOpacity
                                                style={tw`px-3 py-1 bg-[#112E50] rounded`}
                                                onPress={() => handleChangeStatus(c.class_session_id, "confirmed", c.date)}
                                            >
                                                <Text style={tw`text-white`}>Potvrdi</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}

                        {!(scheduleMap[selectedDate] || []).length && (
                            <Text style={tw`text-center text-gray-500 mt-10`}>Nema termina za prikaz.</Text>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modal za prikaz notifikovanog časa */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={tw`flex-1 justify-center items-center bg-black/50 px-4`}>
                    <View style={tw`bg-white w-full rounded-2xl p-5`}>
                        {modalLoading || !selectedSession ? (
                            <ActivityIndicator size="large" color="#F59E0B" />
                        ) : (
                            <>
                                <Text style={tw`text-xl font-bold text-gray-800 mb-2`}>
                                    {selectedSession.course?.name}
                                </Text>
                                <Text style={tw`text-gray-600 mb-1`}>
                                    📅 Datum: {Moment(selectedSession.date).format("DD.MM.YYYY")}
                                </Text>
                                <Text style={tw`text-gray-600 mb-1`}>
                                    🕐 Vreme: {selectedSession.start_time}–{selectedSession.end_time}
                                </Text>
                                <Text style={tw`text-gray-600 mb-1`}>
                                    👨‍🏫 Nastavnik: {selectedSession.teacher?.full_name || "Nepoznato"}
                                </Text>
                                <Text style={tw`text-gray-600 mb-1`}>
                                    Lokacija: {selectedSession.location || "Nepoznato"}
                                </Text>

                                <View style={tw`flex-row justify-around mt-4`}>
                                    <TouchableOpacity
                                        style={tw`px-4 py-2 bg-gray-500 rounded-lg`}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={tw`text-white font-semibold`}>Zatvori</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={tw`px-4 py-2 bg-[#112E50] rounded-lg`}
                                        onPress={() =>
                                            handleChangeStatus(selectedSession.id, "confirmed", selectedSession.date)
                                        }
                                    >
                                        <Text style={tw`text-white font-semibold`}>Potvrdi</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
