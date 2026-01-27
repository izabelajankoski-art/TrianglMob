import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import tw from "twrnc";
import api from "../../api";


export default function ScanStudentScreen({ navigation, route }) {
    const { classSessionId } = route.params;
    const [facing, setFacing] = useState("back");
    const [permission, requestPermission] = useCameraPermissions();
    const isProcessing = useRef(false);

    useEffect(() => {
        if (!permission) requestPermission();
    }, [permission, requestPermission]);

    if (!permission) return <View style={styles.container} />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={tw`text-center pb-8 text-lg font-semibold`}>
                    Potrebna je dozvola za kameru
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionText}>Dozvoli</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const parseQr = (data) => {
        const parsed = JSON.parse(data);

        const teacher_id = parsed.teacher_id != null ? parseInt(parsed.teacher_id, 10) : null;
        const student_id = parsed.student_id != null ? parseInt(parsed.student_id, 10) : null;

        if (!teacher_id && !student_id) {
            return { error: "QR kod ne sadrži ni teacher_id ni student_id." };
        }

        return { parsed, teacher_id, student_id };
    };

    const buildBody = ({ teacher_id, student_id }) => {
        const body = {
            class_session_id: classSessionId,
            status: "present",
        };

        if (teacher_id) body.teacher_id = teacher_id;
        if (student_id) body.student_id = student_id;

        return body;
    };

    const showSuccess = ({ teacher_id, parsed }) => {
        const who = teacher_id ? "Nastavnik" : "Učenik";
        const name = parsed.teacher_name || parsed.student_name || "";
        Alert.alert("Uspeh", `${who} ${name} zabeležen.`);
    };

    const handleNotEnrolledPrompt = async ({ body, parsed, teacher_id }) => {

        if (!body.student_id) {
            Alert.alert("Greška", "Entitet nije prijavljen za ovaj čas.");
            return;
        }

        Alert.alert(
            "Nema časa za učenika",
            "Za ovog učenika ne postoji čas (nije prijavljen / nije upisan). Želite li da kreirate vanredni čas?",
            [
                {
                    text: "Ne",
                    style: "cancel",
                    onPress: () => {
                        // samo resetujemo obradu ranije u finally
                    },
                },
                {
                    text: "Da, kreiraj",
                    onPress: async () => {
                        try {

                            const student = await api.get(`/student/${body.student_id}`);
                            const classSession = await api.get(`/classSession/${body.class_session_id}`);


                            const newCourse = await api.post(`/course`, {
                                name: `VANREDNI ČAS - ${classSession.data.course.name} - ${student.data.full_name}`,
                                price: classSession.data.course.price,
                                description: classSession.data.course.description,
                                type: classSession.data.course.type,
                                format: classSession.data.course.format,
                            });


                            const newEnrollment = await api.post(`/enrollments`, {
                                course_id: newCourse.data.id,
                                price: classSession.data.course.price,
                                discount_percentage: 0,
                                payment_type: "per_session",
                                enrolled_at: new Date().toISOString().split("T")[0],
                                student_id: body.student_id,
                                payment_period: "",
                            });


                            const teacherCours = await api.post(`/teacherCourse`, {
                                teacher_id: classSession.data.teacher_id,
                                course_id: newCourse.data.id,
                            });


                            const newClassSession = await api.post(`/classSession`, {
                                course_id: newCourse.data.id,
                                teacher_id: classSession.data.teacher_id,
                                date: classSession.data.date,
                                start_time: classSession.data.start_time,
                                end_time: classSession.data.end_time,
                                location: classSession.data.location,
                                every_2_weeks: false,
                                every_week: false,
                            });


                            Alert.alert("Uspeh", "Kreiran vanredni čas.");
                        } catch (e) {
                            Alert.alert(
                                "Greška",
                                e?.response?.data?.message || e?.message || "Neuspeh prilikom kreiranja vanrednog časa."
                            );
                        }
                    },
                }
            ]
        );
    };

    const handleBarCodeScanned = async ({ data }) => {
        if (isProcessing.current) return;
        isProcessing.current = true;

        try {
            let result;
            try {
                result = parseQr(data);
            } catch {
                Alert.alert("Greška", "Neispravan format QR koda.");
                return;
            }

            if (result.error) {
                Alert.alert("Greška", result.error);
                return;
            }

            const { parsed, teacher_id, student_id } = result;
            const body = buildBody({ teacher_id, student_id });

            try {
                await api.post("/attendance/change-attendance-status", body);
                showSuccess({ teacher_id, parsed });
            } catch (err) {
                const status = err?.response?.status;

                // ✅ Tvoj slučaj: backend vraća 404 kad ne postoji attendance/enrollment
                if (status === 404) {
                    await handleNotEnrolledPrompt({ body, parsed, teacher_id });
                    return;
                }

                // (Opcionalno) ako backend vrati specijalan code u payload-u
                const code = err?.response?.data?.code;
                if (code === "ATTENDANCE_NOT_FOUND" || code === "ENROLLMENT_NOT_FOUND_FOR_COURSE") {
                    await handleNotEnrolledPrompt({ body, parsed, teacher_id });
                    return;
                }

                Alert.alert("Greška", err?.response?.data?.message || "Neuspeh prilikom slanja.");
            }
        } finally {
            // malo duži cooldown da ne okida više puta
            setTimeout(() => {
                isProcessing.current = false;
            }, 2500);
        }
    };

    const toggleCameraFacing = () => {
        setFacing((f) => (f === "back" ? "front" : "back"));
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                onBarcodeScanned={handleBarCodeScanned}
            />

            <View style={styles.overlay}>
                <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                    <Text style={styles.flipText}>Flip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    camera: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 32,
    },
    flipButton: {
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    flipText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    permissionBtn: tw`flex justify-center items-center mt-4`,
    permissionText: tw`text-center rounded-full p-3 text-lg font-semibold shadow-md text-white bg-blue-500 w-1/3`,
});