// src/app/api/menu/menus/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import { roleMiddleware } from '@/lib/auth';

// Get a specific menu
export const GET = async (request, { params }) => {
    try {
        const { id } = params;
        await connectDB();
        
        const menu = await Menu.findById(id)
            .populate('createdBy', 'username')
            .populate('updatedBy', 'username');
        
        if (!menu) {
            return NextResponse.json(
                { success: false, message: 'Menu not found' },
                { status: 404 }
            );
        }
        
        return NextResponse.json({
            success: true,
            data: menu
        });
    } catch (error) {
        console.error('Error fetching menu:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
};

// Update a menu
const updateHandler = async (request, { params }) => {
    try {
        const { id } = params;
        const {
            name,
            description,
            orderMode,
            isDefault,
            isActive,
            availableFrom,
            availableTo
        } = await request.json();
        
        await connectDB();
        
        // Find menu
        let menu = await Menu.findById(id);
        if (!menu) {
            return NextResponse.json(
                { success: false, message: 'Menu not found' },
                { status: 404 }
            );
        }
        
        // If this menu is being set as default, unset default flag for other menus with the same order mode
        if (isDefault && (!menu.isDefault || orderMode !== menu.orderMode)) {
            await Menu.updateMany(
                { orderMode: orderMode || menu.orderMode, isDefault: true, _id: { $ne: id } },
                { isDefault: false }
            );
        }
        
        // Update fields
        if (name) menu.name = name;
        if (description !== undefined) menu.description = description;
        if (orderMode) menu.orderMode = orderMode;
        if (isDefault !== undefined) menu.isDefault = isDefault;
        if (isActive !== undefined) menu.isActive = isActive;
        if (availableFrom !== undefined) menu.availableFrom = availableFrom;
        if (availableTo !== undefined) menu.availableTo = availableTo;
        
        menu.updatedBy = request.user._id;
        menu.updatedAt = Date.now();
        
        // Save updated menu
        await menu.save();
        
        return NextResponse.json({
            success: true,
            message: 'Menu updated successfully',
            data: menu
        });
    } catch (error) {
        console.error('Error updating menu:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
};

// Delete a menu
const deleteHandler = async (request, { params }) => {
    try {
        const { id } = params;
        await connectDB();
        
        const menu = await Menu.findById(id);
        if (!menu) {
            return NextResponse.json(
                { success: false, message: 'Menu not found' },
                { status: 404 }
            );
        }
        
        // Instead of actually deleting, just mark as inactive
        menu.isActive = false;
        menu.updatedBy = request.user._id;
        menu.updatedAt = Date.now();
        await menu.save();
        
        return NextResponse.json({
            success: true,
            message: 'Menu deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
};

// Only admins and billers can update or delete menus
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);