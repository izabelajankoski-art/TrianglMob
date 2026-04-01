// :contentReference[oaicite:0]{index=0}
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

// 📅 Lokalizacija
LocaleConfig.locales["sr"] = {
    monthNames: ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"],
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

    // učitavanje
    const loadAttendances = useCallback(async () => {
        if (!studentId) return;

        setLoading(true);

        try {
            const res = await api.get(`/student/${studentId}/attendances`);
            setAttendances(res.data.attendances || []);
        } catch (err) {
            console.error(err);
            Alert.alert("Greška", "Neuspešno učitavanje termina.");
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

    // normalizacija
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
                location: a.class_session.location
            }));

        const map = {};

        normalized.forEach(s => {
            if (!map[s.date]) map[s.date] = [];
            map[s.date].push(s);
        });

        setScheduleMap(map);

    }, [attendances, filterType]);

    // kalendar mark
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

    // 🔥 STATUS CHANGE
    const handleChangeStatus = async (sessionId, newStatus, sessionDate) => {

        if (!studentId) return;

        const today = Moment().format("YYYY-MM-DD");

        // ❌ prošli čas
        if (Moment(sessionDate).isBefore(today)) {
            Alert.alert("Zabrana", "Ne možete menjati status za prošle časove.");
            return;
        }

        // ❌ danas ne može otkazivanje
        if (newStatus === "cancelled" && sessionDate === today) {
            Alert.alert("Zabrana", "Čas za danas ne može da se otkaže.");
            return;
        }

        // optimistic update
        setAttendances(prev =>
            prev.map(a =>
                a.class_session_id === sessionId
                    ? { ...a, confirmation_status: newStatus }
                    : a
            )
        );

        try {
            await api.post("/attendance/change-confirmation-status", {
                class_session_id: sessionId,
                student_id: studentId,
                status: newStatus,
            });
        } catch (err) {

            console.error(err);

            // rollback
            setAttendances(prev =>
                prev.map(a =>
                    a.class_session_id === sessionId
                        ? {
                            ...a,
                            confirmation_status:
                                newStatus === "confirmed"
                                    ? "cancelled"
                                    : "confirmed",
                        }
                        : a
                )
            );

            Alert.alert("Greška", "Promena statusa nije uspela.");
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-100`}>

            {/* filter */}
            <View style={tw`flex-row justify-around py-2 bg-white`}>
                {Object.entries(FILTER_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => setFilterType(key)}
                        style={tw`
                            px-5 py-3 rounded-xl
                            ${filterType === key ? "bg-[#FFA500]" : "bg-gray-200"}
                        `}
                    >
                        <Text style={tw`${filterType === key ? "text-white" : "text-gray-700"}`}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* calendar */}
            <View style={tw`mt-4 mx-4 bg-white rounded-xl shadow`}>
                <Calendar
                    onDayPress={(day) => setSelectedDate(day.dateString)}
                    markedDates={markedDates}
                    markingType={"custom"}
                    theme={{
                        todayTextColor: "#112E50",
                        selectedDayBackgroundColor: "#112E50",
                        arrowColor: "#112E50",
                    }}
                    firstDay={1}
                />
            </View>

            {/* list */}
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

                            const today = Moment().format("YYYY-MM-DD");
                            const isPast = Moment(c.date).isBefore(today);
                            const isToday = c.date === today;

                            const isConfirmed = c.confirmation_status === "confirmed";
                            const isCancelled = c.confirmation_status === "cancelled";

                            return (
                                <View
                                    key={c.class_session_id}
                                    style={tw`mb-4 rounded-xl p-4 bg-white shadow`}
                                >
                                    <Text style={tw`font-bold text-gray-800`}>
                                        {c.course.name}
                                    </Text>

                                    <Text style={tw`text-gray-600`}>
                                        {c.start_time}–{c.end_time}
                                    </Text>

                                    <Text style={tw`text-xs text-gray-700`}>
                                        📍{c.location || "Nepoznata lokacija"}
                                    </Text>


                                    {/* STATUS INFO */}
                                    {isPast && (
                                        <Text style={tw`text-xs text-gray-400 mt-2`}>
                                            Ovaj čas je završen
                                        </Text>
                                    )}

                                    {isToday && (
                                        <Text style={tw`text-xs text-orange-500 mt-2`}>
                                            Danas – ne može se otkazati
                                        </Text>
                                    )}

                                    {/* ACTIONS */}
                                    <View style={tw`flex-row gap-2 mt-3`}>

                                        <TouchableOpacity
                                            disabled={isConfirmed || isPast}
                                            style={tw`
                                                px-3 py-2 rounded
                                                ${isConfirmed ? "bg-green-600" : "bg-gray-300"}
                                                ${isPast ? "opacity-40" : ""}
                                            `}
                                            onPress={() =>
                                                handleChangeStatus(c.class_session_id, "confirmed", c.date)
                                            }
                                        >
                                            <Text style={tw`${isConfirmed ? "text-white" : "text-gray-700"}`}>
                                                Potvrdi
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            disabled={isCancelled || isPast || isToday}
                                            style={tw`
                                                px-3 py-2 rounded
                                                ${isCancelled ? "bg-red-600" : "bg-gray-300"}
                                                ${(isPast || isToday) ? "opacity-40" : ""}
                                            `}
                                            onPress={() =>
                                                handleChangeStatus(c.class_session_id, "cancelled", c.date)
                                            }
                                        >
                                            <Text style={tw`${isCancelled ? "text-white" : "text-gray-700"}`}>
                                                Otkaži
                                            </Text>
                                        </TouchableOpacity>

                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}
            </ScrollView>

        </SafeAreaView>
    );
}