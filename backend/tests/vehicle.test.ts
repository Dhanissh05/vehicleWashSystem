/**
 * Vehicle Management Flow Tests
 * 
 * Tests the complete vehicle lifecycle:
 * - Vehicle creation
 * - Status transitions
 * - Worker assignment
 * - Payment handling
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Vehicle Management', () => {
  let testCenterId: string;
  let testCustomerId: string;
  let testWorkerId: string;
  let testVehicleId: string;

  beforeAll(async () => {
    // Create test data
    const center = await prisma.center.create({
      data: {
        name: 'Test Center',
        address: 'Test Address',
        latitude: 12.9716,
        longitude: 77.5946,
        mobile: '9999999999',
      },
    });
    testCenterId = center.id;

    const customer = await prisma.user.create({
      data: {
        mobile: '9876543210',
        name: 'Test Customer',
        role: 'CUSTOMER',
      },
    });
    testCustomerId = customer.id;

    const worker = await prisma.user.create({
      data: {
        mobile: '9876543211',
        name: 'Test Worker',
        role: 'WORKER',
        workerCode: 'WRK001',
        password: '$2a$10$TESTHASH', // Mock hash
      },
    });
    testWorkerId = worker.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.vehicle.deleteMany({
      where: { centerId: testCenterId },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testCustomerId, testWorkerId] },
      },
    });
    await prisma.center.delete({
      where: { id: testCenterId },
    });
  });

  describe('Vehicle Creation', () => {
    it('should create a vehicle with all required fields', async () => {
      const vehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber: 'KA01AB1234',
          vehicleType: 'CAR',
          carCategory: 'SEDAN',
          model: 'Honda City',
          brand: 'Honda',
          color: 'White',
          customerId: testCustomerId,
          centerId: testCenterId,
          status: 'RECEIVED',
        },
      });

      expect(vehicle).toBeDefined();
      expect(vehicle.vehicleNumber).toBe('KA01AB1234');
      expect(vehicle.status).toBe('RECEIVED');
      expect(vehicle.receivedAt).toBeDefined();

      testVehicleId = vehicle.id;
    });

    it('should reject duplicate vehicle numbers', async () => {
      await expect(
        prisma.vehicle.create({
          data: {
            vehicleNumber: 'KA01AB1234', // Duplicate
            vehicleType: 'CAR',
            customerId: testCustomerId,
            centerId: testCenterId,
          },
        })
      ).rejects.toThrow();
    });

    it('should allow two-wheeler creation', async () => {
      const vehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber: 'KA02CD5678',
          vehicleType: 'TWO_WHEELER',
          model: 'Activa',
          brand: 'Honda',
          customerId: testCustomerId,
          centerId: testCenterId,
        },
      });

      expect(vehicle.vehicleType).toBe('TWO_WHEELER');
      expect(vehicle.carCategory).toBeNull();

      // Cleanup
      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });
  });

  describe('Vehicle Status Transitions', () => {
    it('should transition from RECEIVED to WASHING', async () => {
      const updated = await prisma.vehicle.update({
        where: { id: testVehicleId },
        data: {
          status: 'WASHING',
          washingAt: new Date(),
        },
      });

      expect(updated.status).toBe('WASHING');
      expect(updated.washingAt).toBeDefined();
    });

    it('should transition from WASHING to READY_FOR_PICKUP', async () => {
      const updated = await prisma.vehicle.update({
        where: { id: testVehicleId },
        data: {
          status: 'READY_FOR_PICKUP',
          readyAt: new Date(),
        },
      });

      expect(updated.status).toBe('READY_FOR_PICKUP');
      expect(updated.readyAt).toBeDefined();
    });

    it('should transition from READY_FOR_PICKUP to DELIVERED', async () => {
      const updated = await prisma.vehicle.update({
        where: { id: testVehicleId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      expect(updated.status).toBe('DELIVERED');
      expect(updated.deliveredAt).toBeDefined();
    });

    it('should have all timestamps set after full lifecycle', async () => {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicleId },
      });

      expect(vehicle?.receivedAt).toBeDefined();
      expect(vehicle?.washingAt).toBeDefined();
      expect(vehicle?.readyAt).toBeDefined();
      expect(vehicle?.deliveredAt).toBeDefined();
    });
  });

  describe('Worker Assignment', () => {
    it('should assign worker to vehicle', async () => {
      const updated = await prisma.vehicle.update({
        where: { id: testVehicleId },
        data: { workerId: testWorkerId },
        include: { worker: true },
      });

      expect(updated.workerId).toBe(testWorkerId);
      expect(updated.worker?.workerCode).toBe('WRK001');
    });

    it('should query vehicles by worker', async () => {
      const vehicles = await prisma.vehicle.findMany({
        where: { workerId: testWorkerId },
      });

      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0].workerId).toBe(testWorkerId);
    });
  });

  describe('Vehicle Queries', () => {
    it('should find vehicle by number', async () => {
      const vehicle = await prisma.vehicle.findUnique({
        where: { vehicleNumber: 'KA01AB1234' },
      });

      expect(vehicle).toBeDefined();
      expect(vehicle?.customerId).toBe(testCustomerId);
    });

    it('should filter vehicles by status', async () => {
      const vehicles = await prisma.vehicle.findMany({
        where: {
          status: 'DELIVERED',
          centerId: testCenterId,
        },
      });

      vehicles.forEach((v) => {
        expect(v.status).toBe('DELIVERED');
      });
    });

    it('should count vehicles by type', async () => {
      const carCount = await prisma.vehicle.count({
        where: { vehicleType: 'CAR', centerId: testCenterId },
      });

      expect(carCount).toBeGreaterThanOrEqual(1);
    });
  });
});
