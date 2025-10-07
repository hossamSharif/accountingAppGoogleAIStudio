import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';

export const assignUserToFirstShop = async (userId: string): Promise<void> => {
    try {
        // Get the first active shop
        const shopsQuery = query(
            collection(db, 'shops'),
            where('isActive', '==', true),
            limit(1)
        );

        const shopsSnapshot = await getDocs(shopsQuery);

        if (!shopsSnapshot.empty) {
            const firstShop = shopsSnapshot.docs[0];
            const shopId = firstShop.id;

            // Update the user document with the shop ID
            await updateDoc(doc(db, 'users', userId), {
                shopId: shopId
            });

            console.log(`✅ User ${userId} assigned to shop ${shopId}`);
        } else {
            console.error('❌ No active shops found to assign user');
        }
    } catch (error) {
        console.error('❌ Error assigning user to shop:', error);
    }
};

export const listShopsAndUsers = async (): Promise<void> => {
    try {
        console.log('🏪 Available Shops:');
        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        shopsSnapshot.docs.forEach(doc => {
            const shop = doc.data();
            console.log(`  - ${doc.id}: ${shop.name} (${shop.isActive ? 'Active' : 'Inactive'})`);
        });

        console.log('\n👤 Available Users:');
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.docs.forEach(doc => {
            const user = doc.data();
            console.log(`  - ${doc.id}: ${user.name} (${user.role}) - Shop: ${user.shopId || 'Unassigned'}`);
        });
    } catch (error) {
        console.error('❌ Error listing shops and users:', error);
    }
};