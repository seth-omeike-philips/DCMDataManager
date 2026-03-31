

export const mappingDescription = {
    "PatientBirthDate":{
        "description": "Sets the dob to Feb 29 and the year to +-1 of current year. ",
    },
    "PatientID":{
        "description": "Just adds Mapped_ to the beginning of the patientID",
    },
    "PatientName":{
        "description": "Performs a deterministic hash of the patient's name",
    },
    "PatientSex":{
        "description": "If M, generate an even random number in range [0,100] and if F, generate an odd random number in range [0,100]. Otherwise, do nothing.",
    },
    "StudyDate":{
        "description": "Randomly selects the month and day. Randomy selects the year from [1990, 2020].",
    },
    "OtherPatientIDs":{
        "description": "Just adds Mapped_ to the beginning of the OtherPatientIDs",
    }
}
