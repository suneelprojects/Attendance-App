# Student Attendance Android App

## Project Structure

```
app/
├── build.gradle
├── src/
│   └── main/
│       ├── java/com/socialtrack/
│       │   ├── activities/
│       │   │   ├── MainActivity.kt
│       │   │   ├── LoginActivity.kt
│       │   │   ├── AttendanceActivity.kt
│       │   │   ├── HistoryActivity.kt
│       │   │   └── ProfileActivity.kt
│       │   ├── models/
│       │   │   ├── Student.kt
│       │   │   ├── Attendance.kt
│       │   │   └── Batch.kt
│       │   ├── services/
│       │   │   ├── FirebaseService.kt
│       │   │   └── LocationService.kt
│       │   └── utils/
│       │       ├── Constants.kt
│       │       └── Extensions.kt
│       └── res/
           ├── layout/
           │   ├── activity_main.xml
           │   ├── activity_login.xml
           │   ├── activity_attendance.xml
           │   └── activity_history.xml
           └── values/
               ├── colors.xml
               ├── strings.xml
               └── themes.xml
```

## Key Features

1. Student Authentication
   - Login with batch ID
   - Profile management
   - Secure session handling

2. Attendance Marking
   - Location-based attendance
   - QR code scanning
   - Offline mode support
   - Real-time validation

3. History & Analytics
   - Attendance history
   - Monthly statistics
   - Attendance percentage
   - Export functionality

4. Profile Management
   - Student details
   - Batch information
   - Course details

## Technical Implementation

### 1. Dependencies (build.gradle)

```gradle
dependencies {
    // Android core dependencies
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'

    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-firestore-ktx'
    implementation 'com.google.firebase:firebase-auth-ktx'

    // Location services
    implementation 'com.google.android.gms:play-services-location:21.0.1'

    // QR code scanning
    implementation 'com.journeyapps:zxing-android-embedded:4.3.0'

    // Image loading
    implementation 'com.github.bumptech.glide:glide:4.16.0'

    // Charts for analytics
    implementation 'com.github.PhilJay:MPAndroidChart:v3.1.0'

    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3'
}
```

### 2. Key Models

```kotlin
// Student.kt
data class Student(
    val id: String,
    val name: String,
    val email: String,
    val rollNumber: String,
    val batchId: String,
    val mode: String,
    val registeredAt: Long = System.currentTimeMillis()
)

// Attendance.kt
data class Attendance(
    val id: String,
    val studentId: String,
    val batchId: String,
    val date: Long,
    val status: String,
    val location: Location?,
    val mode: String,
    val deviceId: String,
    val markedBySystem: Boolean = false
)

// Batch.kt
data class Batch(
    val id: String,
    val name: String,
    val course: String,
    val startDate: Long,
    val tutor: Tutor
)
```

### 3. Location Service

```kotlin
// LocationService.kt
class LocationService(private val context: Context) {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    
    suspend fun getCurrentLocation(): Location? = suspendCoroutine { continuation ->
        try {
            if (checkLocationPermission()) {
                fusedLocationClient.lastLocation
                    .addOnSuccessListener { location ->
                        continuation.resume(location)
                    }
                    .addOnFailureListener { e ->
                        continuation.resumeWithException(e)
                    }
            } else {
                continuation.resumeWithException(SecurityException("Location permission not granted"))
            }
        } catch (e: Exception) {
            continuation.resumeWithException(e)
        }
    }

    private fun checkLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
}
```

### 4. Firebase Service

```kotlin
// FirebaseService.kt
class FirebaseService {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    suspend fun markAttendance(attendance: Attendance) = withContext(Dispatchers.IO) {
        try {
            db.collection("attendance")
                .add(attendance)
                .await()
        } catch (e: Exception) {
            throw AttendanceException("Failed to mark attendance: ${e.message}")
        }
    }

    suspend fun getStudentHistory(studentId: String): List<Attendance> = withContext(Dispatchers.IO) {
        try {
            db.collection("attendance")
                .whereEqualTo("studentId", studentId)
                .orderBy("date", Query.Direction.DESCENDING)
                .get()
                .await()
                .toObjects(Attendance::class.java)
        } catch (e: Exception) {
            throw HistoryException("Failed to fetch attendance history: ${e.message}")
        }
    }
}
```

### 5. Main Activity UI

```xml
<!-- activity_main.xml -->
<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <com.google.android.material.appbar.AppBarLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content">

        <androidx.appcompat.widget.Toolbar
            android:id="@+id/toolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            android:background="?attr/colorPrimary"
            app:title="@string/app_name"
            app:titleTextColor="@android:color/white" />

    </com.google.android.material.appbar.AppBarLayout>

    <androidx.core.widget.NestedScrollView
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:padding="16dp">

            <com.google.android.material.card.MaterialCardView
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginBottom="16dp"
                app:cardCornerRadius="8dp"
                app:cardElevation="4dp">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:orientation="vertical"
                    android:padding="16dp">

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Today's Attendance"
                        android:textAppearance="?attr/textAppearanceHeadline6" />

                    <Button
                        android:id="@+id/markAttendanceButton"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:layout_marginTop="16dp"
                        android:text="Mark Attendance" />

                </LinearLayout>

            </com.google.android.material.card.MaterialCardView>

            <!-- Add more cards for history, stats, etc. -->

        </LinearLayout>

    </androidx.core.widget.NestedScrollView>

    <com.google.android.material.bottomnavigation.BottomNavigationView
        android:id="@+id/bottomNavigation"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom"
        app:menu="@menu/bottom_navigation_menu" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>
```

### 6. Main Activity Logic

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    private lateinit var locationService: LocationService
    private lateinit var firebaseService: FirebaseService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        locationService = LocationService(this)
        firebaseService = FirebaseService()
        
        setupUI()
        checkPermissions()
    }
    
    private fun setupUI() {
        markAttendanceButton.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val location = locationService.getCurrentLocation()
                    if (location != null) {
                        val attendance = createAttendanceRecord(location)
                        firebaseService.markAttendance(attendance)
                        showSuccess("Attendance marked successfully!")
                    } else {
                        showError("Could not get location. Please try again.")
                    }
                } catch (e: Exception) {
                    showError(e.message ?: "Failed to mark attendance")
                }
            }
        }
    }
    
    private fun checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ),
                LOCATION_PERMISSION_REQUEST_CODE
            )
        }
    }
}
```

## Security Features

1. Device Verification
   - Unique device ID generation
   - Device binding to student account
   - Anti-spoofing measures

2. Location Validation
   - GPS accuracy checking
   - Location spoofing detection
   - Geofencing support

3. Offline Security
   - Local data encryption
   - Secure storage of credentials
   - Sync validation

## Additional Features

1. Notifications
   - Attendance reminders
   - Important announcements
   - Status updates

2. Offline Support
   - Local data storage
   - Background sync
   - Conflict resolution

3. Analytics
   - Attendance trends
   - Monthly reports
   - Performance insights

## Getting Started

1. Clone the repository
2. Set up Firebase project
3. Add google-services.json
4. Build and run the app

## Best Practices

1. MVVM Architecture
2. Clean Code principles
3. Error handling
4. Unit testing
5. UI/UX guidelines