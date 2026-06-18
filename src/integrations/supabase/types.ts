export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          message: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          message?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          message?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      ambulance_bookings: {
        Row: {
          ambulance_id: string | null
          ambulance_type: string
          created_at: string
          driver_id: string | null
          drop_address: string | null
          drop_lat: number | null
          drop_lng: number | null
          eta_minutes: number | null
          fare_estimate: number | null
          fare_final: number | null
          id: string
          notes: string | null
          patient_user_id: string
          pickup_address: string | null
          pickup_lat: number
          pickup_lng: number
          provider_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ambulance_id?: string | null
          ambulance_type?: string
          created_at?: string
          driver_id?: string | null
          drop_address?: string | null
          drop_lat?: number | null
          drop_lng?: number | null
          eta_minutes?: number | null
          fare_estimate?: number | null
          fare_final?: number | null
          id?: string
          notes?: string | null
          patient_user_id: string
          pickup_address?: string | null
          pickup_lat: number
          pickup_lng: number
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ambulance_id?: string | null
          ambulance_type?: string
          created_at?: string
          driver_id?: string | null
          drop_address?: string | null
          drop_lat?: number | null
          drop_lng?: number | null
          eta_minutes?: number | null
          fare_estimate?: number | null
          fare_final?: number | null
          id?: string
          notes?: string | null
          patient_user_id?: string
          pickup_address?: string | null
          pickup_lat?: number
          pickup_lng?: number
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_bookings_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "ambulance_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ambulance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_drivers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          license_number: string | null
          phone: string | null
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          phone?: string | null
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          phone?: string | null
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_drivers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ambulance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_locations: {
        Row: {
          ambulance_id: string
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          speed_kmh: number | null
        }
        Insert: {
          ambulance_id: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          speed_kmh?: number | null
        }
        Update: {
          ambulance_id?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_locations_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_providers: {
        Row: {
          application_status: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_verified: boolean
          name: string
          owner_user_id: string | null
          phone: string | null
        }
        Insert: {
          application_status?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean
          name: string
          owner_user_id?: string | null
          phone?: string | null
        }
        Update: {
          application_status?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean
          name?: string
          owner_user_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      ambulances: {
        Row: {
          active_driver_id: string | null
          ambulance_type: string
          created_at: string
          id: string
          provider_id: string
          status: string
          vehicle_number: string
        }
        Insert: {
          active_driver_id?: string | null
          ambulance_type?: string
          created_at?: string
          id?: string
          provider_id: string
          status?: string
          vehicle_number: string
        }
        Update: {
          active_driver_id?: string | null
          ambulance_type?: string
          created_at?: string
          id?: string
          provider_id?: string
          status?: string
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_active_driver_id_fkey"
            columns: ["active_driver_id"]
            isOneToOne: false
            referencedRelation: "ambulance_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ambulance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          doctor_id: string
          duration_min: number
          id: string
          is_emergency: boolean
          mode: Database["public"]["Enums"]["appointment_mode"]
          patient_id: string
          priority: number
          reason: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          video_room_url: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          duration_min?: number
          id?: string
          is_emergency?: boolean
          mode?: Database["public"]["Enums"]["appointment_mode"]
          patient_id: string
          priority?: number
          reason?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          video_room_url?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          duration_min?: number
          id?: string
          is_emergency?: boolean
          mode?: Database["public"]["Enums"]["appointment_mode"]
          patient_id?: string
          priority?: number
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          video_room_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          slot_minutes: number
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          slot_minutes?: number
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          slot_minutes?: number
          start_time?: string
        }
        Relationships: []
      }
      doctor_leaves: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          leave_date: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          leave_date: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          leave_date?: string
          reason?: string | null
        }
        Relationships: []
      }
      doctor_notes: {
        Row: {
          body: string | null
          created_at: string
          doctor_user_id: string
          done: boolean
          id: string
          is_task: boolean
          patient_id: string | null
          remind_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          doctor_user_id: string
          done?: boolean
          id?: string
          is_task?: boolean
          patient_id?: string | null
          remind_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          doctor_user_id?: string
          done?: boolean
          id?: string
          is_task?: boolean
          patient_id?: string | null
          remind_at?: string | null
          title?: string
        }
        Relationships: []
      }
      doctor_reviews: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          achievements: string | null
          additional_documents: Json
          age: number | null
          alt_phone: string | null
          application_status: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          clinic_address: string | null
          consultation_fee: number
          created_at: string
          experience_certificate_url: string | null
          experience_years: number
          full_name: string
          gender: string | null
          graduation_year: number | null
          id: string
          id_proof_url: string | null
          is_available: boolean
          is_verified: boolean
          languages: string | null
          medical_degree_url: string | null
          medical_school: string | null
          phone: string | null
          previous_hospitals: string | null
          qualifications: string | null
          rating: number
          registration_certificate_url: string | null
          registration_council: string | null
          registration_number: string | null
          rejection_reason: string | null
          specialty: string
          user_id: string | null
        }
        Insert: {
          achievements?: string | null
          additional_documents?: Json
          age?: number | null
          alt_phone?: string | null
          application_status?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          clinic_address?: string | null
          consultation_fee?: number
          created_at?: string
          experience_certificate_url?: string | null
          experience_years?: number
          full_name: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          id_proof_url?: string | null
          is_available?: boolean
          is_verified?: boolean
          languages?: string | null
          medical_degree_url?: string | null
          medical_school?: string | null
          phone?: string | null
          previous_hospitals?: string | null
          qualifications?: string | null
          rating?: number
          registration_certificate_url?: string | null
          registration_council?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          specialty: string
          user_id?: string | null
        }
        Update: {
          achievements?: string | null
          additional_documents?: Json
          age?: number | null
          alt_phone?: string | null
          application_status?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          clinic_address?: string | null
          consultation_fee?: number
          created_at?: string
          experience_certificate_url?: string | null
          experience_years?: number
          full_name?: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          id_proof_url?: string | null
          is_available?: boolean
          is_verified?: boolean
          languages?: string | null
          medical_degree_url?: string | null
          medical_school?: string | null
          phone?: string | null
          previous_hospitals?: string | null
          qualifications?: string | null
          rating?: number
          registration_certificate_url?: string | null
          registration_council?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          specialty?: string
          user_id?: string | null
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          accuracy: number | null
          address_note: string | null
          assigned_to: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          patient_summary: Json
          request_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          address_note?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          patient_summary?: Json
          request_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          address_note?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          patient_summary?: Json
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hospital_beds: {
        Row: {
          available_beds: number
          branch_id: string
          id: string
          total_beds: number
          updated_at: string
          ward_type: string
        }
        Insert: {
          available_beds?: number
          branch_id: string
          id?: string
          total_beds?: number
          updated_at?: string
          ward_type: string
        }
        Update: {
          available_beds?: number
          branch_id?: string
          id?: string
          total_beds?: number
          updated_at?: string
          ward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_beds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "hospital_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          pincode: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          pincode?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          pincode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_branches_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_departments: {
        Row: {
          branch_id: string
          created_at: string
          description: string | null
          head_doctor_name: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          description?: string | null
          head_doctor_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          description?: string | null
          head_doctor_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "hospital_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_staff: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          staff_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          staff_role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          staff_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          application_status: string
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          hospital_type: string
          id: string
          is_verified: boolean
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          pincode: string | null
          slug: string
          state: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          application_status?: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hospital_type?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          pincode?: string | null
          slug: string
          state?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          application_status?: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hospital_type?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          pincode?: string | null
          slug?: string
          state?: string | null
          website?: string | null
        }
        Relationships: []
      }
      medicines: {
        Row: {
          brand: string | null
          id: string
          name: string
          pharmacy_id: string
          price: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          id?: string
          name: string
          pharmacy_id: string
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          id?: string
          name?: string
          pharmacy_id?: string
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: string
          doctor_id: string | null
          failure_reason: string | null
          id: string
          invoice_number: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          patient_id: string
          provider_ref: string | null
          refunded_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          upi_id: string | null
          utr: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          doctor_id?: string | null
          failure_reason?: string | null
          id?: string
          invoice_number?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          patient_id: string
          provider_ref?: string | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          upi_id?: string | null
          utr?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          doctor_id?: string | null
          failure_reason?: string | null
          id?: string
          invoice_number?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          patient_id?: string
          provider_ref?: string | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          upi_id?: string | null
          utr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_verified: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      pharmacy_orders: {
        Row: {
          accepted_at: string | null
          courier_lat: number | null
          courier_lng: number | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          dispatched_at: string | null
          eta_minutes: number | null
          id: string
          items: Json
          lat: number | null
          lng: number | null
          notes: string | null
          pharmacy_id: string | null
          prescription_url: string | null
          status: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          courier_lat?: number | null
          courier_lng?: number | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          dispatched_at?: string | null
          eta_minutes?: number | null
          id?: string
          items?: Json
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pharmacy_id?: string | null
          prescription_url?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          courier_lat?: number | null
          courier_lng?: number | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          dispatched_at?: string | null
          eta_minutes?: number | null
          id?: string
          items?: Json
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pharmacy_id?: string | null
          prescription_url?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prescription_templates: {
        Row: {
          advice: string | null
          created_at: string
          diagnosis: string | null
          doctor_user_id: string
          id: string
          medicines: Json
          name: string
        }
        Insert: {
          advice?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_user_id: string
          id?: string
          medicines?: Json
          name: string
        }
        Update: {
          advice?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_user_id?: string
          id?: string
          medicines?: Json
          name?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          advice: string | null
          appointment_id: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          follow_up_date: string | null
          id: string
          medicines: Json
          patient_id: string
        }
        Insert: {
          advice?: string | null
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          follow_up_date?: string | null
          id?: string
          medicines?: Json
          patient_id: string
        }
        Update: {
          advice?: string | null
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          follow_up_date?: string | null
          id?: string
          medicines?: Json
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          allergies: string | null
          avatar_url: string | null
          blood_group: string | null
          chronic_conditions: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_location_accuracy: number | null
          last_location_at: string | null
          location_consent: boolean
          phone: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_lat?: number | null
          last_lng?: number | null
          last_location_accuracy?: number | null
          last_location_at?: string | null
          location_consent?: boolean
          phone?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_location_accuracy?: number | null
          last_location_at?: string | null
          location_consent?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_chat_messages: {
        Row: {
          appointment_id: string
          body: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          appointment_id: string
          body: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: []
      }
      video_sessions: {
        Row: {
          appointment_id: string
          created_at: string
          expires_at: string | null
          id: string
          room_name: string
          room_url: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          room_name: string
          room_url: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          room_name?: string
          room_url?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          bp_diastolic: number | null
          bp_systolic: number | null
          doctor_id: string | null
          heart_rate: number | null
          height_cm: number | null
          id: string
          notes: string | null
          patient_id: string
          recorded_at: string
          spo2: number | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          bp_diastolic?: number | null
          bp_systolic?: number | null
          doctor_id?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          recorded_at?: string
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          bp_diastolic?: number | null
          bp_systolic?: number | null
          doctor_id?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          recorded_at?: string
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      public_doctors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          consultation_fee: number | null
          created_at: string | null
          experience_years: number | null
          full_name: string | null
          graduation_year: number | null
          id: string | null
          is_available: boolean | null
          is_verified: boolean | null
          languages: string | null
          medical_school: string | null
          qualifications: string | null
          rating: number | null
          specialty: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string | null
          graduation_year?: number | null
          id?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          languages?: string | null
          medical_school?: string | null
          qualifications?: string | null
          rating?: number | null
          specialty?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string | null
          graduation_year?: number | null
          id?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          languages?: string | null
          medical_school?: string | null
          qualifications?: string | null
          rating?: number | null
          specialty?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      grant_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ambulance_driver: {
        Args: { _ambulance_id: string; _user: string }
        Returns: boolean
      }
      is_hospital_member: {
        Args: { _hospital_id: string; _user: string }
        Returns: boolean
      }
      is_provider_owner: {
        Args: { _provider_id: string; _user: string }
        Returns: boolean
      }
      list_role_members: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          email: string
          full_name: string
          granted_at: string
          user_id: string
        }[]
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      set_role_permission: {
        Args: {
          _allowed: boolean
          _key: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      verify_doctor: {
        Args: { _doctor_id: string; _verified: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "patient"
        | "doctor"
        | "admin"
        | "hospital"
        | "ambulance"
        | "super_admin"
      appointment_mode: "video" | "in_person"
      appointment_status:
        | "pending_payment"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      payment_method: "upi" | "card" | "wallet" | "netbanking" | "cash"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "patient",
        "doctor",
        "admin",
        "hospital",
        "ambulance",
        "super_admin",
      ],
      appointment_mode: ["video", "in_person"],
      appointment_status: [
        "pending_payment",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      payment_method: ["upi", "card", "wallet", "netbanking", "cash"],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ],
    },
  },
} as const
