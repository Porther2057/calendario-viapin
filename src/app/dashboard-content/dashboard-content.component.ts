import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface CalendarEvent {
  id: string;
  name: string;
  type: string;
  date: Date;
  startTime: string;
  endTime: string;
  color: string;
}

interface WeekDay {
  date: Date;
  day: number;
  name: string;
  isToday: boolean;
}

interface ActivityStats {
  estrategica: number;
  administrativa: number;
  operativa: number;
  personal: number;
}


@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard-content.component.html',
  styleUrls: ['./dashboard-content.component.css']
})
export class DashboardContentComponent implements OnInit {

  private readonly BASE_HOUR = 3; // Hora base del calendario (3 AM)
  
  isDragging = false;
  draggedEvent: CalendarEvent | null = null;
  dragStartPosition: { x: number, y: number } = { x: 0, y: 0 };
  dragPreviewElement: HTMLDivElement | null = null;
  
  draggedEventId: string | null = null;
  

  currentDate: Date;
  currentMonthName: string;
  currentYear: number;
  calendarDays: { day: number, isCurrentMonth: boolean, isHoliday: boolean }[][] = [];
  day: any;
  time: string = '';
endDay: string = '';

 // Variables para el horario del evento
  availableTimes: string[] = [];
  startTime: string = '';
  endTime: string = '';

  events: CalendarEvent[] = [];

  private typeColors: { [key: string]: { backgroundColor: string, borderColor: string } } = {
    'estrategica': { backgroundColor: '#EFD9D9', borderColor: '#EF0A06' },
    'administrativa': {  backgroundColor: '#D8EDD7', borderColor: '#0AD600' },
    'operativa': { backgroundColor: '#CADCF4', borderColor: '#086CF0' },
    'personal': { backgroundColor: '#E4E4E4', borderColor: '#747474' }
  };
  

  // Variables para el modal
  isCreateEventModalOpen: boolean = false;
  isModalOpen: boolean = false; // Controla la visibilidad del modal
  selectedDate: Date | null = null;
  selectedStartTime: string = '';
  selectedEndTime: string = '';

   //  para los porcentajes
   activityPercentages: ActivityStats = {
    estrategica: 0,
    administrativa: 0,
    operativa: 0,
    personal: 0
  };
 

   // Variable para los datos del formulario
   eventName: string = '';
   activityType: string = '';

  constructor(private cdr: ChangeDetectorRef) {
    this.currentDate = new Date();
    this.currentMonthName = this.getMonthName(this.currentDate.getMonth());
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.updateCalendar();
    this.generateAvailableTimes();
    
  }

  getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }

  changeMonth(direction: number): void {
    const newMonth = this.currentDate.getMonth() + direction;

    if (newMonth > 11) {
      this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
      this.currentDate.setMonth(0);
    } else if (newMonth < 0) {
      this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
      this.currentDate.setMonth(11);
    } else {
      this.currentDate.setMonth(newMonth);
    }

    this.currentMonthName = this.getMonthName(this.currentDate.getMonth());
    this.currentYear = this.currentDate.getFullYear();
    this.updateCalendar();
    this.cdr.detectChanges();
  }

  updateCalendar(): void {
    const daysInMonth = new Date(this.currentYear, this.currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(this.currentYear, this.currentDate.getMonth(), 1).getDay();
    const lastDayOfMonth = new Date(this.currentYear, this.currentDate.getMonth() + 1, 0).getDay();
  
    this.calendarDays = [];
    let week: { day: number, isCurrentMonth: boolean, isHoliday: boolean }[] = [];
  
    const holidays = this.getHolidaysForMonth(this.currentYear, this.currentDate.getMonth());
  
    // Rellenar los días del mes anterior si es necesario
    const prevMonthDays = new Date(this.currentYear, this.currentDate.getMonth(), 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      week.push({ day: prevMonthDays - i, isCurrentMonth: false, isHoliday: false });
    }
  
    // Agregar los días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const isHoliday = holidays.includes(day);
      week.push({ day, isCurrentMonth: true, isHoliday });
  
      if (week.length === 7) {
        this.calendarDays.push(week);
        week = [];
      }
    }
  
    // Rellenar los días del mes siguiente 
    const remainingDays = 7 - week.length;
    for (let i = 1; i <= remainingDays; i++) {
      week.push({ day: i, isCurrentMonth: false, isHoliday: false });
    }
  
    // Si hay días en la última semana, agregarla al calendario
    if (week.length > 0) {
      this.calendarDays.push(week);
    }
  }
  getHolidaysForMonth(year: number, month: number): number[] {
    const fixedHolidays = [
      { month: 0, day: 1 }, // Año Nuevo
      { month: 4, day: 1 }, // Día del Trabajo
      { month: 6, day: 20 }, // Día de la Independencia
      { month: 7, day: 7 }, // Batalla de Boyacá
      { month: 11, day: 8 }, // Inmaculada Concepción
      { month: 11, day: 25 } // Navidad
    ];
  
    const mobileHolidays = this.calculateMobileHolidays(year);
  
    // Combinar festivos fijos y móviles del mes específico
    return [
      ...fixedHolidays.filter(h => h.month === month).map(h => h.day),
      ...mobileHolidays.filter(h => h.month === month).map(h => h.day)
    ];
  }
  
  calculateMobileHolidays(year: number): { month: number, day: number }[] {
    const holidays: { month: number, day: number }[] = [];
  
    // Calcular Domingo de Pascua
    const easter = this.calculateEasterSunday(year);
  
    // Jueves Santo y Viernes Santo
    const holyThursday = new Date(easter);
    holyThursday.setDate(easter.getDate() - 3);
    holidays.push({ month: holyThursday.getMonth(), day: holyThursday.getDate() });
  
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    holidays.push({ month: goodFriday.getMonth(), day: goodFriday.getDate() });
  
    // Corpus Christi
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);
    holidays.push({ month: corpusChristi.getMonth(), day: corpusChristi.getDate() });
  
    // Sagrado Corazón de Jesús
    const sacredHeart = new Date(easter);
    sacredHeart.setDate(easter.getDate() + 68);
    holidays.push({ month: sacredHeart.getMonth(), day: sacredHeart.getDate() });
  
    // Festivos con corrimientos al lunes
    holidays.push(...this.getMondayHolidays(year));
  
    return holidays;
  }
  
  getMondayHolidays(year: number): { month: number, day: number }[] {
    const holidays: { month: number, day: number }[] = [];
  
    // Día de los Reyes Magos (6 de enero trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 0, 6));
  
    // Día de San José (19 de marzo trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 2, 19));
  
    // San Pedro y San Pablo (29 de junio trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 5, 29));
  
    // Asunción de la Virgen (15 de agosto trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 7, 15));
  
    // Día de la Raza (12 de octubre trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 9, 12));
  
    // Día de Todos los Santos (1 de noviembre trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 10, 1));
  
    // Independencia de Cartagena (11 de noviembre trasladado al lunes)
    holidays.push(this.getFirstMondayAfter(year, 10, 11));
  
    return holidays;
  }
  
  getFirstMondayAfter(year: number, month: number, day: number): { month: number, day: number } {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
  
    // Si el día ya es lunes, no se traslada
    if (dayOfWeek === 1) {
      return { month: date.getMonth(), day: date.getDate() };
    }
  
    // Calcular la diferencia para llegar al próximo lunes
    const daysToAdd = (8 - dayOfWeek) % 7;
    date.setDate(date.getDate() + daysToAdd);
  
    return { month: date.getMonth(), day: date.getDate() };
  }
  
  calculateEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }
  
  
 // Método para abrir el modal
 openCreateEventModal(): void {
  // Resetear solo los campos que no son la fecha
  this.eventName = '';
  this.activityType = '';
  this.selectedStartTime = '';
  this.selectedEndTime = '';
  this.time = '';
  this.endDay = '';
  
  this.isModalOpen = true;
}

// Métodos para el modal
onModalBackgroundClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    this.closeModal();
  }
}

onModalContentClick(event: MouseEvent): void {
  event.stopPropagation();
}


onDayClick(day: any) {
  if (day && day.isCurrentMonth) {
    // Crear una nueva fecha basada en el día seleccionado
    const selectedDate = new Date(this.currentYear, this.currentDate.getMonth(), day.day);
    
    // Establecer la fecha seleccionada
    this.selectedDate = selectedDate;
    
    // Formatear la fecha para el input del formulario
    this.day = this.formatDate(selectedDate);
    
    // Abrir el modal
    this.openCreateEventModal();
  }
}

submitForm(): void {
  if (!this.eventName || !this.activityType || !this.selectedDate || !this.selectedStartTime || !this.selectedEndTime) {
    alert('Por favor, complete todos los campos.');
    return;
  }

  // Convertir tiempo a minutos desde la medianoche
  const getMinutesFromMidnight = (timeString: string) => {
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  const startMinutes = getMinutesFromMidnight(this.selectedStartTime);
  const endMinutes = getMinutesFromMidnight(this.selectedEndTime);

  // Verificar que la hora de fin sea posterior a la hora de inicio
  if (endMinutes <= startMinutes) {
    alert('La hora de finalización debe ser posterior a la hora de inicio.');
    return;
  }

  // Crear objeto temporal para verificación
  const newEvent: Partial<CalendarEvent> = {
    date: this.selectedDate,
    startTime: this.selectedStartTime,
    endTime: this.selectedEndTime
  };

  // Verificar colisión de horarios
  if (this.checkTimeCollision(newEvent)) {
    alert('Ya existe un evento programado en ese horario. Por favor, seleccione un horario diferente.');
    return;
  }

  // Si no hay colisión, crear el evento
  const finalEvent: CalendarEvent = {
    id: Date.now().toString(),
    name: this.eventName,
    type: this.activityType,
    date: this.selectedDate,
    startTime: this.selectedStartTime,
    endTime: this.selectedEndTime,
    color: this.typeColors[this.activityType as keyof typeof this.typeColors].backgroundColor
  };

  // Añadir el evento y recalcular porcentajes
  this.events.push(finalEvent);
  this.calculateActivityPercentages();
  
  this.closeModal();
  this.cdr.detectChanges();
}

resetForm(): void {
  this.eventName = ''; 
  this.activityType = '';
  this.selectedDate = null;
  this.selectedStartTime = '';
  this.selectedEndTime = '';
  this.time = '';
  this.endDay = '';
  this.day = '';
}

closeModal(): void {
  this.isModalOpen = false;
  this.resetForm();
}

@HostListener('document:mousemove', ['$event'])
onMouseMove(event: MouseEvent) {
  if (this.isDragging && this.draggedEvent) {
    event.preventDefault();
    
    if (!this.dragPreviewElement) {
      this.dragPreviewElement = document.createElement('div');
      this.dragPreviewElement.classList.add('event-drag-preview');
      this.dragPreviewElement.style.position = 'absolute';
      this.dragPreviewElement.style.pointerEvents = 'none';
      this.dragPreviewElement.style.zIndex = '1000';
      this.dragPreviewElement.style.opacity = '0.7';
      this.dragPreviewElement.style.backgroundColor = this.typeColors[this.draggedEvent.type].backgroundColor;
      this.dragPreviewElement.style.border = `2px dashed ${this.typeColors[this.draggedEvent.type].borderColor}`;
      this.dragPreviewElement.style.padding = '5px';
      this.dragPreviewElement.style.width = '200px'; // Ancho fijo similar a evento
      this.dragPreviewElement.style.position = 'absolute';
      
      // Contenido del preview
      const nameElement = document.createElement('div');
      nameElement.textContent = this.draggedEvent.name;
      
      const timeElement = document.createElement('div');
      timeElement.textContent = `${this.draggedEvent.startTime} - ${this.draggedEvent.endTime}`;
      timeElement.style.fontSize = '0.8em';
      timeElement.style.color = 'gray';
      
      this.dragPreviewElement.appendChild(nameElement);
      this.dragPreviewElement.appendChild(timeElement);
      
      document.body.appendChild(this.dragPreviewElement);
    }

    // Posicionar preview
    this.dragPreviewElement.style.left = `${event.clientX + 10}px`;
    this.dragPreviewElement.style.top = `${event.clientY + 10}px`;
  }
}

@HostListener('document:mouseup', ['$event'])
onMouseUp(event: MouseEvent) {
  if (this.isDragging && this.draggedEvent) {
    this.finalizeDragDrop(event);
  }
}

startDragEvent(event: MouseEvent, calendarEvent: CalendarEvent) {
  event.preventDefault();
  this.isDragging = true;
  this.draggedEvent = { ...calendarEvent };

  const eventElement = event.target as HTMLElement;
  eventElement.classList.add('event-dragging');
}

findTargetDay(event: MouseEvent): WeekDay | null {
  const weekDays = this.getWeekDays();
  const calendarElement = document.querySelector('.calendar');

  if (!calendarElement) return null;
  const calendarRect = calendarElement.getBoundingClientRect();
  const mouseX = event.clientX - calendarRect.left;
  const dayWidth = calendarRect.width / 7;
  const dayIndex = Math.floor(mouseX / dayWidth);

  return dayIndex >= 0 && dayIndex < weekDays.length ? weekDays[dayIndex] : null;
}

updateEventDate(event: CalendarEvent, targetDay: WeekDay) {
  const originalIndex = this.events.findIndex(e => e.id === event.id);
  if (originalIndex !== -1) {

    this.events[originalIndex] = {
      ...this.events[originalIndex],
      date: targetDay.date
    };
    this.calculateActivityPercentages();
  }
}

finalizeDragDrop(event: MouseEvent) {

  const eventElements = document.querySelectorAll('.event-dragging');
  eventElements.forEach(el => el.classList.remove('event-dragging'));


  if (this.dragPreviewElement) {
    document.body.removeChild(this.dragPreviewElement);
    this.dragPreviewElement = null;
  }

  const targetDay = this.findTargetDay(event);

  if (targetDay) {
    this.updateEventDate(this.draggedEvent!, targetDay);
  }

  this.isDragging = false;
  this.draggedEvent = null;
  this.cdr.detectChanges();
}

getEventsForDay(weekDay: WeekDay): CalendarEvent[] {
  return this.events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getDate() === weekDay.date.getDate() &&
           eventDate.getMonth() === weekDay.date.getMonth() &&
           eventDate.getFullYear() === weekDay.date.getFullYear();
  });
}

hasEventAtHour(weekDay: WeekDay, hour: number): CalendarEvent | null {
  const events = this.getEventsForDay(weekDay);
  return events.find(event => {
    const startHour = this.getHourFromTimeString(event.startTime);
    const endHour = this.getHourFromTimeString(event.endTime);
    return hour === startHour;
  }) || null;
}


private getHourFromTimeString(timeString: string): number {
  if (!timeString) return this.BASE_HOUR;
  
  const [time, period] = timeString.split(' ');
  let [hours] = time.split(':').map(Number);
  
  // Convertir a formato 24 horas
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours;
}

isEventInHour(event: CalendarEvent, hour: number): boolean {
  const startHour = this.getHourFromTimeString(event.startTime);
  const endHour = this.getHourFromTimeString(event.endTime);
  // Solo retorna true para la hora de inicio del evento
  return hour === startHour + 1;
}

getEventStyle(event: CalendarEvent): any {
  const startHour = this.getHourFromTimeString(event.startTime);
  const endHour = this.getHourFromTimeString(event.endTime);
  const duration = endHour - startHour;
  
  // Extract minutes from start and end times
  const [startMinutes, endMinutes] = [
    parseInt(event.startTime.split(':')[1].split(' ')[0]),
    parseInt(event.endTime.split(':')[1].split(' ')[0])
  ];

  // Calculate vertical offset and height proportionally
  const minuteOffset = startMinutes / 60;
  const minuteDuration = ((endHour - startHour) * 60 + (endMinutes - startMinutes)) / 60;

  const eventColor = this.typeColors[event.type];

  return {
    position: 'absolute',
    top: `${minuteOffset * 82}px`, // Adjust top position based on minutes
    left: '0',
    right: '0',
    height: `${minuteDuration * 82}px`, // Adjust height proportionally
    backgroundColor: eventColor.backgroundColor,
    borderLeft: `8px solid ${eventColor.borderColor}`,
    color: eventColor.borderColor,
    padding: '4px',
    zIndex: 1,
    overflow: 'hidden',
    cursor: 'grab',
    userSelect: 'none',
    margin: '0'
  };
}
 formatEventTime(event: CalendarEvent): string {
    return `${event.startTime} - ${event.endTime}`;
  }

  getWeekRange(): string {
    const startOfWeek = this.getStartOfWeek(this.currentDate);
    const endOfWeek = this.getEndOfWeek(this.currentDate);
    const startMonth = this.getMonthName(startOfWeek.getMonth());
    const endMonth = this.getMonthName(endOfWeek.getMonth());
    return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${this.currentYear}`;
  }
  
  getStartOfWeek(date: Date): Date {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuste para que el lunes sea el primer día
    startOfWeek.setDate(diff);
    return startOfWeek;
  }
  
  getEndOfWeek(date: Date): Date {
    const startOfWeek = this.getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return endOfWeek;
  }

  changeWeek(direction: number): void {
    this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
    this.updateCalendar();
    this.cdr.detectChanges();
  }
  
  getWeekNumber(date: Date): number {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + 1) / 7);
  }

  // Método para obtener los días de la semana (lunes a domingo)
  getWeekDays(): WeekDay[] {
    const startOfWeek = this.getStartOfWeek(this.currentDate);
    const weekDays: WeekDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      
      weekDays.push({ 
        date: currentDay,
        day: currentDay.getDate(),
        name: this.getDayName(currentDay.getDay()),
        isToday: currentDay.toDateString() === new Date().toDateString()
      });
    }
    
    return weekDays;
  }

// Método para obtener el nombre del día
getDayName(dayIndex: number): string {
  const daysOfWeek = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ];
  return daysOfWeek[dayIndex];
}


generateAvailableTimes(): void {
  const times: string[] = [];
  
  // Generar horas desde BASE_HOUR (3 AM) hasta 12 AM del día siguiente
  for (let hour = this.BASE_HOUR; hour < this.BASE_HOUR + 21; hour++) {
    const adjustedHour = hour % 24; // Asegura que las horas estén en el rango 0-23
    const isPM = adjustedHour >= 12;
    const displayHour = adjustedHour > 12 ? adjustedHour - 12 : (adjustedHour === 0 ? 12 : adjustedHour);
    
    // Añadir intervalos de 15 minutos
    ['00', '15', '30', '45'].forEach(minute => {
      times.push(`${displayHour.toString().padStart(2, '0')}:${minute} ${isPM ? 'PM' : 'AM'}`);
    });
  }
  
  this.availableTimes = times;
}

onDateClick(event: Event): void {
  const inputElement = event.target as HTMLInputElement;
  const selectedValue = inputElement.value;
  const selectedDate = new Date(selectedValue);
  this.selectedDate = selectedDate;
  this.day = this.formatDate(selectedDate);
}

// Métodos actualizados
onDateChange(event: any): void {
  const selectedValue = event.target.value;
  const [year, month, day] = selectedValue.split('-').map(Number);
  this.selectedDate = new Date(year, month - 1, day); // Removemos UTC
  this.day = selectedValue;
}

onStartTimeChange(value: string): void {
  this.selectedStartTime = value;
  this.time = value;
}

onEndTimeChange(value: string): void {
  this.selectedEndTime = value;
  this.endDay = value;
}

private formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

private checkTimeCollision(newEvent: Partial<CalendarEvent>): boolean {
  const newStartTime = newEvent.startTime || '';
  const newEndTime = newEvent.endTime || '';
  const newDate = newEvent.date;

  // Convertir tiempo a minutos desde la medianoche
  const getMinutesFromMidnight = (timeString: string): number => {
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  const newStartMinutes = getMinutesFromMidnight(newStartTime);
  const newEndMinutes = getMinutesFromMidnight(newEndTime);

  return this.events.some(existingEvent => {
    // Solo verificar eventos del mismo día
    if (existingEvent.date.toDateString() !== newDate?.toDateString()) {
      return false;
    }

    const existingStartMinutes = getMinutesFromMidnight(existingEvent.startTime);
    const existingEndMinutes = getMinutesFromMidnight(existingEvent.endTime);

    // Verificar superposición precisa de minutos
    return (
      (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
      (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
      (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes)
    );
  });
}

// Método auxiliar para convertir tiempo en formato "HH:MM AM/PM" a número de hora
private timeStringToHour(timeString: string): number {
  const [time, period] = timeString.split(' ');
  let [hours] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours;
}

private calculateEventDuration(event: CalendarEvent): number {
  const startHour = this.timeStringToHour(event.startTime);
  const endHour = this.timeStringToHour(event.endTime);
  return endHour - startHour;
}

// Método para calcular los porcentajes
private calculateActivityPercentages(): void {
  // Objeto para almacenar las horas totales por tipo de actividad
  const hoursPerActivity: ActivityStats = {
    estrategica: 0,
    administrativa: 0,
    operativa: 0,
    personal: 0
  };

  // Calcular horas totales por tipo de actividad
  let totalHours = 0;
  
  this.events.forEach(event => {
    const duration = this.calculateEventDuration(event);
    hoursPerActivity[event.type as keyof ActivityStats] += duration;
    totalHours += duration;
  });

  // Si no hay eventos, establecer todos los porcentajes a 0
  if (totalHours === 0) {
    this.activityPercentages = {
      estrategica: 0,
      administrativa: 0,
      operativa: 0,
      personal: 0
    };
    return;
  }

  // Calcular porcentajes
  Object.keys(hoursPerActivity).forEach(type => {
    const percentage = (hoursPerActivity[type as keyof ActivityStats] / totalHours) * 100;
    this.activityPercentages[type as keyof ActivityStats] = Math.round(percentage);
  });

  // Forzar actualización de la vista
  this.cdr.detectChanges();
}



}


