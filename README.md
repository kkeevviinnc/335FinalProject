# 335FinalProject

**Submitted by:** *Name (directory id)*

**Group Members:** Kevin Cheng (kcheng14), Jon Rossi (jrossi2)

**App Description:** Allow Shuttle-UM drivers to sign up for vacant shifts.

**YouTube Video Link:** *Insert Link Here*

**APIs:** Nodemailer (https://www.nodemailer.com/)

**Contact Email:**  kcheng14@umd.edu

This project will be a reworking of Shuttle-UM's Subleave, which allows driving staff to request leave from shifts and pick up subleave shifts. 

For CMSC335, this application will be implemented in a limited functionality as described below.
The project is hosted on https://three35finalproject-ombp.onrender.com/


# CMSC335 Final Project Functionality
1. Data Storage using MongoDB
    - DrivingShifts: A collection should store all available shifts (driving and dispatch)
        * Example Shifts:
        
        {"Date": "12/02/2024", "Shift_ID" : "12-02-24-77", "Route" : "STY", "Route_Name" : "Standby", "Package": "FT-43", "Time_Start": "19:45", "Time_End": "20:50", "Start_Location": "Base", "End_Location": "Base", "Driver": null}

        {"Date": "12/06/2024", "Shift_ID" : "12-06-24-306", "Route" : "105-5", "Route_Name" : "Campus Connector-5", "Package": "SF-06", "Time_Start": "10:58", "Time_End": "12:48", "Start_Location": "Regents", "End_Location": "Regents", "Driver": "Z02"}

        {"Date": "12/02/2024", "Shift_ID" : "12-02-24-501", "Route" : "DSP-H", "Route_Name" : "Dispatch H", "Package": "DSP-H", "Time_Start": "16:30", "Time_End": "19:30", "Start_Location": "Base", "End_Location": "Base", "Driver": "D12"}

        {"Date": "12/02/2024", "Shift_ID" : "12-02-24-412", "Route" : "DR-3B", "Route_Name" : "Demand Response 3B", "Package": "PB-12", "Time_Start": "13:30", "Time_End": "17:30", "Start_Location": "Base", "End_Location": "Base", "Driver": "P24"}
      

    - Drivers: A collection to store all drivers and their information:

       {"Name" : "Kevin Cheng", "Driver_Number" : "Z02", "Email" : "myEmail@gmail.com", "Dispatch-Trained" : true}

1. Form 2: Drivers should be able to fill out a form to select available shifts.
    - The form should allow all driving staff to select available driving shifts. (Shifts in DrivingShifts with Driver set to null)
    - The form should only allow ** dispatch-trained ** staff to select dispatching shifts.

2. Form 2 Processing:
    - DrivingShifts will be updated accordingly. A confirmation email will be sent to the driver.

3. Form 3: Add Driver to Drivers Collection
4. Form 5: Add Shifts to Shifts Collection


# Full Functionality (IGNORE THIS FOR NOW! :P)
1. Authentication: Drivers should have to authenticate themselves to use the form
2. Data Storage using MongoDB
    - DrivingShifts: A collection should store all available shifts (driving and dispatch)
        * This collection must actively be adding future shifts that fall into a window. 
        * Example Shifts:
        {"Date": "12/02/2024", "Shift-ID" : "12-02-24-77", "Route" : "STY", "Package": "FT-43", "Time_Start": "19:45", "Time_End": "20:50", "Start_Location": "Base", "End_Location": "Base", "Driver": null}

        {"Date": "12/06/2024", "Shift-ID" : "12-06-24-306", "Route" : "105-5", "Package": "SF-06", "Time_Start": "10:58", "Time_End": "12:48", "Start_Location": "Regents", "End_Location": "Regents", "Driver": "Z02"}
    - DispatchShifts: Same as above, but for dispatching shifts
    - LeaveLimits(TBD): A collection should store all constraints: # approved leaves per type, per day. Example:
        {"Date": "12/06/2024", ???}
    - LeaveRequests: A collection should store all requests made:
        {"Date_of_request": "11/30/2024", "Shift_ID" : "12-06-24-306", "Approved": false}
    - Drivers: A collection to store all drivers and their information:
        {"Name" : "Kevin Cheng", "Driver_Number" : "Z02", "email" : "myEmail@gmail.com"}

3. Form 1: Drivers should be able to fill out a form to request leave. 
    - The form should allow them to select one day, multiple days, or partial day
    - The form should allow them to select leave type. Students/C1s are the only ones allowed to select the last option and can ONLY select that option:
        * Annual Leave
        * Sick (Medical appointment, documentation is required upon return to work.)
        * Personal Leave
        * Compensatory Leave
        * Jury Duty or Legal Leave
        * FOR STUDENTS AND C1s ONLY: Sick/Safe Leave
4. Form 1 Processing:
    - A document of the request will be created and store it in LeaveRequests. Depending on the corresponding LeaveLimits document, the "Approved" field will be set to true or false.
    - If true, the driver should be removed from the corresponding shift. 
5. Form 2: Drivers should be able to fill out a form to select available shifts.
    - The form should allow all driving staff to select available driving shifts. (Shifts in DrivingShifts with Driver set to null)
    - The form should only allow ** dispatch-trained ** staff to select dispatching shifts.
6. Form 2 Processing:
    - DrivingShifts will be updated accordingly.
7. Forms 3 & 4: Add/Delete Driver from Drivers Collection
8. Forms 5 & 6: Add/Delete Shifts
9. Form 7: Add Shifts from CSV
10. There are loads more, like manager overrides, dispatcher overrides, etc. 
